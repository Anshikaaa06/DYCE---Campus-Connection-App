const { PrismaClient } = require("../generated/prisma/client.js");
const { findRandomMatch } = require("../services/matching.service.js");

const prisma = new PrismaClient();

const startBlindDate = async (req, res) => {
  try {
    const userId = req.userId;

    // Check if user is already in a blind date
    const existingDate = await prisma.blindDate.findFirst({
      where: {
        OR: [
          { initiatorId: userId, active: true },
          { receiverId: userId, active: true },
        ],
      },
    });

    if (existingDate) {
      return res.status(400).json({
        success: false,
        message: "You are already in an active blind date",
      });
    }

    // Find a random user for blind date
    const potentialMatch = await findRandomMatch(userId);

    if (!potentialMatch) {
      return res.status(404).json({
        success: false,
        message: "No available users for blind date at the moment",
      });
    }

    // Create blind date session
    const blindDate = await prisma.blindDate.create({
      data: {
        initiatorId: userId,
        receiverId: potentialMatch.id,
        // duration: 15, // 15 minutes
        active: true,
        // expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      },
    });

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: potentialMatch.id,
        message:
          "You've been paired for a blind date! Chat anonymously for 15 minutes.",
        type: "BLIND_DATE",
      },
    });

    res.status(201).json({
      success: true,
      message: "Blind date started successfully",
      data: {
        blindDateId: blindDate.id,
        partnerId: potentialMatch.id,
        // duration: blindDate.duration,
        // expiresAt: blindDate.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error starting blind date:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start blind date",
    });
  }
};

const getCurrentBlindDate = async (req, res) => {
  try {
    const userId = req.userId;

    const blindDate = await prisma.blindDate.findFirst({
      where: {
        OR: [
          { initiatorId: userId, active: true },
          { receiverId: userId, active: true },
        ],
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!blindDate) {
      return res.status(404).json({
        success: false,
        message: "No active blind date found",
      });
    }

    // Check if blind date has expired
    if (new Date() > blindDate.expiresAt) {
      await prisma.blindDate.update({
        where: { id: blindDate.id },
        data: { active: false },
      });

      return res.status(410).json({
        success: false,
        message: "Blind date has expired",
      });
    }

    const partnerId =
      blindDate.initiatorId === userId
        ? blindDate.receiverId
        : blindDate.initiatorId;
    const timeRemaining = Math.max(0, blindDate.expiresAt - new Date());

    res.status(200).json({
      success: true,
      data: {
        blindDateId: blindDate.id,
        partnerId,
        timeRemaining: Math.floor(timeRemaining / 1000), // in seconds
        revealed: blindDate.revealed,
        messages: blindDate.messages,
        canReveal: blindDate.bothAgreeToReveal,
      },
    });
  } catch (error) {
    console.error("Error getting current blind date:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get blind date",
    });
  }
};

const sendBlindDateMessage = async (req, res) => {
  try {
    const { blindDateId, content, type = "TEXT" } = req.body;
    const senderId = req.userId;

    // Validate blind date exists and user is part of it
    const blindDate = await prisma.blindDate.findFirst({
      where: {
        id: blindDateId,
        OR: [{ initiatorId: senderId }, { receiverId: senderId }],
        active: true,
      },
    });

    if (!blindDate) {
      return res.status(404).json({
        success: false,
        message: "Blind date not found or inactive",
      });
    }

    // Check if blind date has expired
    if (new Date() > blindDate.expiresAt) {
      await prisma.blindDate.update({
        where: { id: blindDate.id },
        data: { active: false },
      });

      return res.status(410).json({
        success: false,
        message: "Blind date has expired",
      });
    }

    // Only allow text and emoji messages
    if (type !== "TEXT" && type !== "EMOJI") {
      return res.status(400).json({
        success: false,
        message: "Only text and emoji messages are allowed in blind dates",
      });
    }

    const message = await prisma.blindDateMessage.create({
      data: {
        blindDateId,
        senderId,
        content,
        type,
        anonymous: !blindDate.revealed,
      },
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error sending blind date message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
};

const agreeToReveal = async (req, res) => {
  try {
    const { blindDateId } = req.params;
    const userId = req.userId;

    const blindDate = await prisma.blindDate.findFirst({
      where: {
        id: blindDateId,
        OR: [{ initiatorId: userId }, { receiverId: userId }],
        active: true,
      },
    });

    if (!blindDate) {
      return res.status(404).json({
        success: false,
        message: "Blind date not found or inactive",
      });
    }

    // Update user's reveal preference
    const isInitiator = blindDate.initiatorId === userId;
    const updateData = isInitiator
      ? { initiatorAgreeToReveal: true }
      : { receiverAgreeToReveal: true };

    const updatedBlindDate = await prisma.blindDate.update({
      where: { id: blindDateId },
      data: updateData,
    });

    // Check if both users agreed to reveal
    if (
      updatedBlindDate.initiatorAgreeToReveal &&
      updatedBlindDate.receiverAgreeToReveal
    ) {
      await prisma.blindDate.update({
        where: { id: blindDateId },
        data: {
          revealed: true,
          bothAgreeToReveal: true,
        },
      });

      // Create notifications for both users
      await prisma.notification.createMany({
        data: [
          {
            userId: blindDate.initiatorId,
            message:
              "Identities revealed! You can now see who you were chatting with.",
            type: "BLIND_DATE_REVEAL",
          },
          {
            userId: blindDate.receiverId,
            message:
              "Identities revealed! You can now see who you were chatting with.",
            type: "BLIND_DATE_REVEAL",
          },
        ],
      });

      // Get partner info for response
      const partnerId = isInitiator
        ? blindDate.receiverId
        : blindDate.initiatorId;
      const partner = await prisma.user.findUnique({
        where: { id: partnerId },
        select: {
          id: true,
          name: true,
          age: true,
          about: true,
          profileImages: {
            take: 1,
            orderBy: { order: "asc" },
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: "Identities revealed!",
        data: {
          revealed: true,
          partner,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Waiting for your partner to agree to reveal identities",
      data: {
        revealed: false,
        waitingForPartner: true,
      },
    });
  } catch (error) {
    console.error("Error agreeing to reveal:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process reveal request",
    });
  }
};

const endBlindDate = async (req, res) => {
  try {
    const { blindDateId } = req.params;
    const userId = req.userId;

    const blindDate = await prisma.blindDate.findFirst({
      where: {
        id: blindDateId,
        OR: [{ initiatorId: userId }, { receiverId: userId }],
      },
    });

    if (!blindDate) {
      return res.status(404).json({
        success: false,
        message: "Blind date not found",
      });
    }

    await prisma.blindDate.update({
      where: { id: blindDateId },
      data: {
        active: false,
        endedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Blind date ended successfully",
    });
  } catch (error) {
    console.error("Error ending blind date:", error);
    res.status(500).json({
      success: false,
      message: "Failed to end blind date",
    });
  }
};

const getBlindDateHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const blindDates = await prisma.blindDate.findMany({
      where: {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
        active: false,
      },
      include: {
        initiator: {
          select: {
            id: true,
            name: true,
            profileImages: {
              take: 1,
              orderBy: { order: "asc" },
            },
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            profileImages: {
              take: 1,
              orderBy: { order: "asc" },
            },
          },
        },
        messages: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const formattedDates = blindDates.map((date) => ({
      id: date.id,
      partner: date.initiatorId === userId ? date.receiver : date.initiator,
      duration: date.duration,
      revealed: date.revealed,
      messageCount: date.messages.length,
      createdAt: date.createdAt,
      endedAt: date.endedAt,
    }));

    res.status(200).json({
      success: true,
      data: formattedDates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: blindDates.length,
      },
    });
  } catch (error) {
    console.error("Error getting blind date history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get blind date history",
    });
  }
};

module.exports = {
  startBlindDate,
  getCurrentBlindDate,
  sendBlindDateMessage,
  agreeToReveal,
  endBlindDate,
  getBlindDateHistory,
};
