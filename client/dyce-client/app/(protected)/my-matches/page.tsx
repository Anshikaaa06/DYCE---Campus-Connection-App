"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  Sparkles,
  Bubbles,
  MessageCircle,
  HeartCrack,
} from "lucide-react";
import { axiosClient } from "@/lib/axios-client";
import { toast } from "sonner";
import BlockModal from "@/components/Matching/BlockModal";
import { cn, getConnectionIntent } from "@/lib/utils";
import BottomNavigation from "@/components/BottomNavigation";
import { Profile } from "@/types/profile";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

export interface MatchesItemType {
  compatibility: number;
  createdAt: string;
  id: string;
  user: Profile;
}

const MyMatches = () => {
  const [profiles, setProfiles] = useState<MatchesItemType[]>([]);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const router = useRouter();

  const handleUnmatch = async () => {
    try {
      if (!matchId) {
        toast.error("No match selected to unmatch.");
        return;
      }
      await axiosClient.post(`/matches/unmatch/${matchId}`);
      setProfiles((prev) => prev.filter((profile) => profile.id !== matchId));
      setShowUnmatchModal(false);
      toast.success("Unmatched successfully.");
    } catch (error) {
      setShowUnmatchModal(false);
      toast.error("Failed to unmatch. Please try again later.");
      console.error("Error unmatching profile:", error);
    }
  };

  useEffect(() => {
    const showProfiles = async () => {
      try {
        const resp = await axiosClient.get("/matches", {
          params: {
            inDetail: true,
          },
        });
        console.log(resp);
        setProfiles((prev) => [...prev, ...resp.data.matches]);
      } catch (error) {
        toast.error("Failed to load profiles. Please try again later.");
        console.error("Error fetching profiles:", error);
      }
    };

    showProfiles();
  }, []);

  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-dark text-light flex items-center justify-center pb-20">
        <div className="text-center">
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-2">No matches yet!</h2>
          <p className="text-light/70">Check out the profiles for new vibes ✨</p>
        </div>

        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-light relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-light/10">
        <div className="font-serif text-2xl text-primary">DYCE</div>
      </div>

      {/* Main Content - with padding bottom for navigation */}
      <div className="flex-1 flex items-center justify-center p-4 pb-24">
        <div className="relative w-full max-w-sm">
          <Swiper slidesPerView={1} centeredSlides grabCursor>
            {profiles.map((profile, ind) => (
              <SwiperSlide key={ind}>
                <div
                  className={cn(
                    `relative bg-light/5 backdrop-blur-sm rounded-3xl border border-light/10 overflow-hidden cursor-grab active:cursor-grabbing transition-transform duration-300`
                  )}
                >
                  {/* Profile Image */}
                  <div className="relative h-96 bg-gradient-to-br from-primary/20 to-emotional/20">
                    <Swiper
                      modules={[Pagination]}
                      onTouchStart={(s, e) => e.stopPropagation()}
                      onTouchEnd={(s, e) => e.stopPropagation()}
                      onTouchMove={(s, e) => e.stopPropagation()}
                      slidesPerView={1}
                      loop
                      pagination={{ clickable: true }}
                    >
                      {profile.user.profileImages.map((image, index) => (
                        <SwiperSlide key={index}>
                          <div className="relative h-96">
                            <Image
                              src={`${process.env.NEXT_PUBLIC_SERVER_URL}${image.url}`}
                              alt={profile.user.name}
                              fill
                              className="w-full h-full object-cover"
                              priority
                            />
                          </div>
                        </SwiperSlide>
                      ))}
                    </Swiper>

                    <div className="absolute top-4 right-4 gap-1 flex items-center z-10">
                      <button
                        onClick={() => router.push("/messages")}
                        className="p-2 bg-dark/50 backdrop-blur-sm rounded-full text-light/70 hover:text-light transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setMatchId(profile.id);
                          setShowUnmatchModal(true);
                        }}
                        className="p-2 bg-dark/50 backdrop-blur-sm rounded-full text-light/70 hover:text-light transition-colors"
                      >
                        <HeartCrack className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 z-10">
                      <div className="bg-dark/70 backdrop-blur-sm rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-sans font-bold text-xl text-light">
                            {profile.user.name}, {profile.user.age}
                          </h3>
                          <div className="flex items-center gap-2">
                            <div className="bg-primary/20 px-2 py-1 rounded-full text-primary text-xs font-rounded">
                              {profile.user.college}
                            </div>
                            <div className="bg-primary/20 px-2 py-1 rounded-full text-primary text-xs font-rounded">
                              {profile.user.currentMood}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-amber-400/20 px-2 py-1 rounded-full text-amber-400 text-xs font-rounded">
                            {profile.user.height} cm
                          </div>
                          {profile.user.branchVisible && (
                            <div className="bg-accent/20 px-2 py-1 rounded-full text-accent text-xs font-rounded">
                              {profile.user.branch}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="p-6">
                    {/* Vibe Score */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <span className="font-rounded font-medium">
                          Compatibilty Score
                        </span>
                      </div>
                      <div className="text-primary font-bold text-lg capitalize">
                        {profile.compatibility}%
                      </div>
                    </div>

                    {/* Connection Type */}
                    <div className="mb-4">
                      <h4 className="text-light/80 text-sm font-medium mb-2">
                        Looking for
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-emotional/20 text-emotional px-3 py-1 rounded-full text-xs font-rounded">
                          {
                            getConnectionIntent(profile.user.connectionIntent!)
                              ?.label
                          }
                        </span>
                      </div>
                    </div>

                    {/* Campus Vibes TAgs */}
                    <div className="mb-4">
                      <h4 className="text-light/80 text-sm font-medium mb-2">
                        Campus Vibes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.user.campusVibeTags.map((tag, index) => (
                          <span
                            key={index}
                            className="bg-accent/20 text-accent px-3 py-1 rounded-full text-xs font-rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Interests */}
                    <div className="mb-6">
                      <h4 className="text-light/80 text-sm font-medium mb-2">
                        Interests
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.user.interests.map((interest, index) => (
                          <span
                            key={index}
                            className="bg-emotional/20 text-emotional px-3 py-1 rounded-full text-xs font-rounded"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Hangout Spot */}
                    <div className="mb-6">
                      <h4 className="text-light/80 text-sm font-medium mb-2">
                        Hangout Spot
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-rounded">
                          {profile.user.hangoutSpot || "Not specified"}
                        </span>
                      </div>
                    </div>
                    {/* Personality Type */}
                    <div className="mb-6">
                      <h4 className="text-light/80 text-sm font-medium mb-2">
                        Personality Type
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-emotional/20 text-emotional px-3 py-1 rounded-full text-xs font-rounded">
                          {profile.user.personalityType || "Not specified"}
                        </span>
                      </div>
                    </div>

                    {/* Fun Prompts */}
                    <div className="space-y-4">
                      <div className="bg-light/5 backdrop-blur-sm rounded-3xl p-6 border border-light/10">
                        <div className="flex items-center gap-2 mb-4">
                          <Heart className="w-5 h-5 text-emotional" />
                          <h3 className="font-sans font-semibold text-lg text-light">
                            Ideal first date would be...
                          </h3>
                        </div>
                        <div className="space-y-4">
                          {profile.user.funPrompt1 ? (
                            <div className="bg-light/5 rounded-2xl p-4 border border-light/10">
                              <p className="text-light/80 text-sm mb-2 italic">
                                &quot;{profile.user.funPrompt1}&quot;
                              </p>
                            </div>
                          ) : (
                            <p className="text-light/80 text-sm mb-2 italic px-4">
                              Not Specified.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="bg-light/5 backdrop-blur-sm rounded-3xl p-6 border border-light/10">
                        <div className="flex items-center gap-2 mb-4">
                          <MessageCircle className="w-5 h-5 text-emerald-500" />
                          <h3 className="font-sans font-semibold text-lg text-light">
                            Chai or Coffee...
                          </h3>
                        </div>
                        <div className="space-y-4">
                          {profile.user.funPrompt2 ? (
                            <div className="bg-light/5 rounded-2xl p-4 border border-light/10">
                              <p className="text-light/80 text-sm mb-2 italic">
                                &quot;{profile.user.funPrompt2}&quot;
                              </p>
                            </div>
                          ) : (
                            <p className="text-light/80 text-sm mb-2 italic px-4">
                              Not Specified.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="bg-light/5 backdrop-blur-sm rounded-3xl p-6 border border-light/10">
                        <div className="flex items-center gap-2 mb-4">
                          <Bubbles className="w-5 h-5 text-primary" />
                          <h3 className="font-sans font-semibold text-lg text-light">
                            I can&apos;t stop talking about...
                          </h3>
                        </div>
                        <div className="space-y-4">
                          {profile.user.funPrompt3 ? (
                            <div className="bg-light/5 rounded-2xl p-4 border border-light/10">
                              <p className="text-light/80 text-sm mb-2 italic">
                                &quot;{profile.user.funPrompt3}&quot;
                              </p>
                            </div>
                          ) : (
                            <p className="text-light/80 text-sm mb-2 italic px-4">
                              Not Specified.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>

      <BottomNavigation />

      {/* Unmatch Modal */}
      {showUnmatchModal && (
        <BlockModal
          handleClose={() => setShowUnmatchModal(false)}
          handleBlock={handleUnmatch}
          title="Unmatch this profile?"
          desc="Are you sure you want to unmatch this profile? They won't show up again and can't interact with you."
          btnLabel="Unmatch"
        />
      )}
    </div>
  );
};

export default MyMatches;
