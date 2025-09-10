import React, { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/useChatStore';
import ChatHeader from './ChatHeader';
import MessageInput from './MessageInput';
import MessageSkeleton from './skeletons/MessageSkeleton';
import { useAuthStore } from '../store/useAuthStore';
import { formatMessageTime } from '../lib/utils';
import { axiosInstance } from '../lib/axios.js';

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessageLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const contextMenuRef = useRef(null);

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    messageId: null,
    isOwn: false,
  });

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
      return () => unsubscribeFromMessages();
    }
  }, [selectedUser?._id]);

  useEffect(() => {
    if (messageEndRef.current && messages.length > 0) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleRightClick = (e, messageId, isOwn) => {
    e.preventDefault();
    const bubble = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      visible: true,
      x: bubble.left + (isOwn ? bubble.width - 130 : 0),
      y: bubble.top + window.scrollY - 60,
      messageId,
      isOwn,
    });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startEditing = (message) => {
    setEditingMessageId(message._id);
    setEditingText(message.text);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleSaveEdit = async (id) => {
    try {
      await axiosInstance.put(`/messages/${id}`, { text: editingText });
      setEditingMessageId(null);
      setEditingText('');
      // Refetch to ensure updated state if socket missed
      getMessages(selectedUser._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/messages/${id}`, {
        data: { userId: authUser._id }
      });
      getMessages(selectedUser._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = async (id) => {
    const msg = messages.find(m => m._id === id);
    if (msg?.text) {
      try {
        await navigator.clipboard.writeText(msg.text);
      } catch (err) {
        console.error("Copy failed", err);
      }
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  if (isMessageLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          const isOwn = message.senderId === authUser._id;
          const isEditing = editingMessageId === message._id;

          const isDeletedForUser = message.deletedFor?.includes(authUser._id);
          const showEditedLabel = message.edited && !isDeletedForUser;

          const tooltipTime =
            message.editedAt || message.updatedAt || message.createdAt;

          return (
            <div
              key={message._id}
              ref={isLast ? messageEndRef : null}
              onContextMenu={(e) => handleRightClick(e, message._id, isOwn)}
              className={`chat ${isOwn ? 'chat-end' : 'chat-start'}`}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={
                      isOwn
                        ? authUser.profilepic || '/avatar.png'
                        : selectedUser.profilepic || '/avatar.png'
                    }
                    alt="profile"
                  />
                </div>
              </div>

              <div className="chat-header mb-1">
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>

              <div className="chat-bubble flex flex-col">
                {message.image && !isDeletedForUser && message.image !== "null" && message.image !== "" && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}

                {isDeletedForUser ? (
                  <p className="italic text-gray-500">You deleted this message</p>
                ) : (
                  <>
                    {!isEditing && message.text && <p>{message.text}</p>}

                    {isEditing && (
                      <div className="flex flex-col gap-2">
                        <textarea
                          className="border rounded p-2 w-full"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            className="bg-blue-500 text-white px-3 py-1 rounded"
                            onClick={() => handleSaveEdit(message._id)}
                          >
                            Save
                          </button>
                          <button
                            className="bg-red-600 px-3 py-1 rounded"
                            onClick={() => setEditingMessageId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {showEditedLabel && !isEditing && (
                      <span
                        className="text-xs text-gray-400 mt-1 self-end"
                        title={`Last edited: ${formatMessageTime(tooltipTime)}`}
                      >
                        Edited
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {contextMenu.visible && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-white text-black dark:bg-gray-800 dark:text-white shadow-lg border border-gray-300 dark:border-gray-700 rounded-md w-32"
            style={{
              top: `${contextMenu.y}px`,
              left: `${contextMenu.x}px`,
            }}
          >
            <div
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => handleCopy(contextMenu.messageId)}
            >
              📋 Copy
            </div>

            {contextMenu.isOwn && (
              <div
                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => {
                  const msg = messages.find(m => m._id === contextMenu.messageId);
                  if (msg) startEditing(msg);
                }}
              >
                ✏️ Edit
              </div>
            )}

            <div
              className="px-4 py-2 hover:bg-red-100 dark:hover:bg-red-600 cursor-pointer"
              onClick={() => {
                handleDelete(contextMenu.messageId);
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
            >
              🗑️ Delete
            </div>
          </div>
        )}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;
