import { ChatView } from "../components/ChatView";
import { Composer } from "../components/composer";

export function AskPage() {
  return (
    <div className="chat">
      <ChatView />
      <Composer />
    </div>
  );
}
