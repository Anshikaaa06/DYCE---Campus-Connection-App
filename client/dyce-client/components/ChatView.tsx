"use client";

import {
  Chat,
  Channel,
  MessageInput,
  MessageList,
  Window,
  LoadingIndicator,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStreamClient } from "@/lib/stream";
import { useAuthStore } from "@/stores/auth-store";

import "stream-chat-react/dist/css/v2/index.css"; // Optional: include Stream's base styles
import { ArrowLeft, Unlink } from "lucide-react";

interface ChatViewProps {
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export default function ChatView({ otherUser }: ChatViewProps) {
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUnmatchModal, setShowUnmatchModal] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    const client = getStreamClient();
    const initChat = async () => {

      // Only connect once per user
      if (!client.userID) {
        const tokenRes = await fetch(`/api/chat/token?userId=${user.id}`);
        const { token } = await tokenRes.json();

        await client.connectUser(
          {
            id: user.id,
            name: user.name,
            image: user.avatar,
          },
          token
        );
      }

      // Create or get existing channel
      const chatChannel = client.channel("messaging", {
        members: [user.id, otherUser.id],
      });

      await chatChannel.watch();

      setChatClient(client);
      setChannel(chatChannel);
      setLoading(false);
    };

    initChat();

    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, otherUser.id]);

  const handleUnmatch = async () => {
    setShowUnmatchModal(false);
  };

  if (loading || !chatClient || !channel) {
    return (
      <div className="flex items-center justify-center h-screen bg-dark text-light">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className="h-screen">
      <Chat client={chatClient} theme="str-chat__theme-dark">
        <Channel channel={channel}>
          <Window>
            <div className="p-4 border-b border-light/10 bg-dark/80 flex justify-between items-center">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-light/10 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h2 className="text-primary font-semibold">{otherUser.name}</h2>
                <p className="text-xs text-light/60">Chatting now</p>
              </div>
              <button
                    onClick={() => setShowUnmatchModal(true)}
                    className="p-2 hover:bg-light/10 rounded-full transition-colors"
                  >
                    <Unlink className="w-5 h-5" />
                  </button>
            </div>

            <MessageList />
            <MessageInput focus />
          </Window>
        </Channel>
      </Chat>

      {showUnmatchModal && (
        <div className="fixed inset-0 bg-dark/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-light/5 backdrop-blur-sm rounded-3xl p-6 border border-light/10 max-w-sm mx-4">
            <h2 className="font-serif text-xl text-light mb-2">Unmatch {otherUser.name}?</h2>
            <p className="text-light/70 text-sm mb-6">
              This will end your chat and remove you from each other&apos;s matches.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowUnmatchModal(false)}
                className="flex-1 py-3 bg-light/10 rounded-2xl text-light/70 font-rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleUnmatch}
                className="flex-1 py-3 bg-red-500 rounded-2xl text-white font-rounded"
              >
                Unmatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 'use client';

// import { useEffect, useState, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { ArrowLeft, Clock, Send } from "lucide-react";
// import { getStreamClient } from '@/lib/stream';
// import { useAuthStore } from '@/stores/auth-store';
// import { StreamChat } from "stream-chat";

// export default function ChatView({ otherUser }: { otherUser: any }) {
//   const [channel, setChannel] = useState<any>(null);
//   const [client, setClient] = useState<StreamChat | null>(null);
//   const [messages, setMessages] = useState<any[]>([]);
//   const [newMessage, setNewMessage] = useState("");
//   const [clientReady, setClientReady] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement | null>(null);
//   const router = useRouter();

//   const { user } = useAuthStore();

//   // Scroll to bottom on new messages
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//   }, [messages]);

//  useEffect(() => {
//   let chatChannel: any;

//   const initChat = async () => {
//     const existingClient = getStreamClient();

//     if (!existingClient.userID) {
//       const tokenRes = await fetch(`/api/chat/token?userId=${user.id}`);
//       const { token } = await tokenRes.json();

//       await existingClient.connectUser(
//         {
//           id: user.id,
//           name: user.name,
//           image: user.avatar,
//         },
//         token
//       );
//     }

//     chatChannel = existingClient.channel("messaging", {
//       members: [user.id, otherUser.id],
//     });

//     await chatChannel.watch();
//     setChannel(chatChannel);
//     setMessages(chatChannel.state.messages);
//     setClient(existingClient);
//     setClientReady(true);

//     const handleNewMessage = (event: any) => {
//       setMessages((prev) => {
//         // Prevent duplicates
//         if (prev.find((m) => m.id === event.message.id)) return prev;
//         return [...prev, event.message];
//       });
//     };

//     // Remove previous listeners before adding new one
//     chatChannel.off('message.new', handleNewMessage);
//     chatChannel.on('message.new', handleNewMessage);
//   };

//   initChat();

//   return () => {
//     if (chatChannel) {
//       chatChannel.off(); // Remove all listeners
//     }
//   };
// }, [user, otherUser]);

//   const sendMessage = async () => {
//     if (!newMessage.trim()) return;
//     await channel.sendMessage({ text: newMessage });
//     setNewMessage('');
//     // Do NOT manually push message here; wait for `message.new` to trigger it
//   };

//   if (!clientReady || !channel) return <div className="text-center mt-10 text-light">Loading chat...</div>;

//   return (
//     <div className="h-screen bg-dark text-light flex flex-col relative">
//       {/* Header */}
//       <div className="p-4 border-b border-light/10 bg-dark/80 flex justify-between items-center">
//         <button onClick={() => router.back()} className="p-2 hover:bg-light/10 rounded-full">
//           <ArrowLeft className="w-5 h-5" />
//         </button>
//         <div className="text-center">
//           <h2 className="text-primary font-semibold">{otherUser.name}</h2>
//           <p className="text-xs text-light/60">Chatting now</p>
//         </div>
//         <Clock className="w-5 h-5 text-light/60" />
//       </div>

//       {/* Messages */}
//       <div className="flex-1 overflow-y-auto px-4 py-2">
//         {messages.map((message) => (
//           <div
//             key={message.id}
//             className={`flex ${message.user?.id === user.id ? "justify-end" : "justify-start"}`}
//           >
//             <div className={`p-3 rounded-2xl mb-2 max-w-xs ${
//               message.user?.id === user.id
//                 ? "bg-gradient-to-r from-primary to-emotional text-white"
//                 : "bg-light/10 text-light"
//             }`}>
//               {message.text}
//             </div>
//           </div>
//         ))}
//         <div ref={messagesEndRef} />
//       </div>

//       {/* Input */}
//       <div className="p-4 border-t border-light/10 bg-dark/80 flex items-center gap-2">
//         <input
//           type="text"
//           className="flex-1 bg-light/10 p-3 rounded-2xl text-light outline-none"
//           placeholder="Type a message..."
//           value={newMessage}
//           onChange={(e) => setNewMessage(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//         />
//         <button
//           onClick={sendMessage}
//           disabled={!newMessage.trim()}
//           className={`p-3 rounded-full ${
//             newMessage.trim()
//               ? "bg-gradient-to-r from-primary to-emotional"
//               : "bg-light/20"
//           }`}
//         >
//           <Send className="w-5 h-5 text-white" />
//         </button>
//       </div>
//     </div>
//   );
// }
