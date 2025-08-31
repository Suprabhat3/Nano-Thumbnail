// pages/index.tsx
import ChatBot from "@/components/Chat";
import ProtectedRoute from "@/components/ProtectedRoute";

const ChatPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <ChatBot />
    </ProtectedRoute>
  );
};

export default ChatPage;