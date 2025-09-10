import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    try {
      await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      // set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    // --- Handle new messages ---
    socket.on("newMessage", (newMessage) => {
      const isRelevantMessage =
        newMessage.senderId === selectedUser._id ||
        newMessage.receiverId === selectedUser._id;

      if (!isRelevantMessage) return;

      set({ messages: [...get().messages, newMessage] });
    });

    // --- Handle message edits ---
    socket.on("messageEdited", (updatedMessage) => {
      const isRelevantMessage =
        updatedMessage.senderId === selectedUser._id ||
        updatedMessage.receiverId === selectedUser._id;

      if (!isRelevantMessage) return;

      set({
        messages: get().messages.map((m) =>
          m._id === updatedMessage._id
            ? {
              ...m,
              text: updatedMessage.text,
              edited: updatedMessage.edited ?? true, // fallback if backend didn't send
              editedAt: updatedMessage.editedAt || new Date().toISOString()
            }
            : m
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messageEdited");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));
