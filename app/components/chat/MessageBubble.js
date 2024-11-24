'use client';

// components/chat/MessageBubble.js
export default function MessageBubble({ message, isUser, timestamp }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isUser
            ? 'bg-primary text-white rounded-br-none'
            : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
        }`}
      >
        <div className="mb-1 text-sm font-medium">
          {isUser ? 'You' : 'Virtual Patient'}
        </div>
        <p className="text-sm md:text-base whitespace-pre-wrap">{message}</p>
        <div className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
          {new Date(timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}