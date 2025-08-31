// pages/index.tsx
import ChatBot from "@/components/Chat";
import ProtectedRoute from "@/components/ProtectedRoute";

const chat: React.FC = () => {
  return (
    <ProtectedRoute>
   <ChatBot />
   </ProtectedRoute>
)};

export default chat;