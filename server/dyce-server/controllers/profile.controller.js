const { PrismaClient } = require("../generated/prisma/client.js");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const prisma = new PrismaClient();

// Configure multer for profile images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/profiles";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and GIF are allowed."));
    }
  },
});

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        profileImages: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const {
      password,
      resetPasswordExpiresAt,
      resetPasswordToken,
      updatedAt,
      createdAt,
      otpCode,
      otpExpiresAt,
      ...profileData
    } = user;
    res.status(200).json({
      success: true,
      profile: profileData,
    });
  } catch (error) {
    console.error("Error in getProfile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const {
      age,
      name,
      gender,
      branch,
      interests,
      branchVisible,
      height,
      personalityType,
      campusVibeTags,
      hangoutSpot,
      favoriteArtist,
      funPrompt1,
      funPrompt2,
      funPrompt3,
      currentMood,
      connectionIntent, // 'study_buddy', 'fest_and_fun', 'genuine_connection', 'just_vibing', 'its_complicated'
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name && { name: name.trim()}),
        ...(age && { age: parseInt(age) }),
        ...(gender && { gender }),
        ...(interests && {
          interests: Array.isArray(interests)
            ? interests
            : interests.split(","),
        }),
        ...(branch && { branch }),
        ...(branchVisible !== undefined && { branchVisible: branchVisible }),
        ...(height && { height: parseFloat(height) }),
        ...(personalityType && { personalityType }),
        ...(campusVibeTags && {
          campusVibeTags: Array.isArray(campusVibeTags)
            ? campusVibeTags
            : campusVibeTags.split(","),
        }),
        ...(hangoutSpot && {
          hangoutSpot: hangoutSpot,
        }),
        ...(favoriteArtist && { favoriteArtist: Array.isArray(favoriteArtist) ? favoriteArtist : favoriteArtist.split(",") }),
        ...(funPrompt1 && { funPrompt1 }),
        ...(funPrompt2 && { funPrompt2 }),
        ...(funPrompt3 && { funPrompt3 }),
        ...(currentMood && { currentMood }),
        ...(connectionIntent && { connectionIntent }),
      },
      include: {
        profileImages: {
          orderBy: { order: "asc" },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      profile: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateProfile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Upload profile image
const uploadProfileImages = async (req, res) => {
  try {
    const files = req.files;

    if (!files || files.length < 3 || files.length > 6) {
      return res.status(400).json({
        success: false,
        message: "Please upload between 3 to 6 images.",
      });
    }

    const uploadDir = "uploads/profiles";

    const imageCount = await prisma.photo.count({
      where: { userId: req.userId },
    });

    const savedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const compressedFilename = `compressed-${file.filename}`;
      const compressedPath = path.join(uploadDir, compressedFilename);

      // Compress image
      await sharp(file.path)
        .resize({ width: 1080 }) // optional
        .jpeg({ quality: 70 }) // tweak as needed
        .toFile(compressedPath);

      // Delete original
      fs.unlink(file.path, (err) => {
        if (err) console.error("Failed to delete original image:", err);
      });

      // Save to DB
      const imageRecord = await prisma.photo.create({
        data: {
          userId: req.userId,
          url: `/uploads/profiles/${compressedFilename}`,
          order: imageCount + i,
        },
      });

      savedImages.push(imageRecord);
    }

    res.status(201).json({
      success: true,
      message: "Images uploaded & compressed successfully.",
      images: savedImages,
    });
  } catch (error) {
    console.error("uploadProfileImages error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// Get engagement stats
const getEngagementStats = async (req, res) => {
  try {
    const [likesReceived, matchesCount, messagesReceived, commentsReceived] =
      await Promise.all([
        prisma.like.count({ where: { likedId: req.userId } }),
        prisma.match.count({
          where: {
            OR: [{ user1Id: req.userId }, { user2Id: req.userId }],
            // isActive: true,
          },
        }),
        prisma.chat.count({ where: { receiverId: req.userId } }),
        prisma.comment.count({ where: { userId: req.userId } }),
      ]);

    res.status(200).json({
      success: true,
      stats: {
        likesReceived,
        matchesCount,
        messagesReceived,
        commentsReceived,
      },
    });
  } catch (error) {
    console.error("Error in getEngagementStats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get users who liked the profile
const getProfileLikes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const likes = await prisma.like.findMany({
      where: { receiverId: req.userId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            age: true,
            profileImages: {
              take: 1,
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      likes: likes.map((like) => ({
        id: like.id,
        user: like.sender,
        likedAt: like.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: likes.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error in getProfileLikes:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get anonymous comments
const getAnonymousComments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const comments = await prisma.comment.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    });

    res.status(200).json({
      success: true,
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: comments.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error in getAnonymousComments:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getProfileById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profileImages: {
          take: 1,
          orderBy: { order: "asc" },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error in getProfileById:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getCurrentMood = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { currentMood: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, currentMood: user.currentMood });
  } catch (error) {
    console.error("Error in getCurrentMood:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadProfileImages,
  getEngagementStats,
  getProfileLikes,
  getAnonymousComments,
  upload,
  getProfileById,
  getCurrentMood
};
