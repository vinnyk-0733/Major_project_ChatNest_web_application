import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { encrypt, decrypt } from "../utils/encryption.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.log("Error in getUsersForSidebar", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMessages = async (req, res) => {
  const userId = req.user._id.toString();
  const otherUserId = req.params.id;

  try {
    const messages = await Message.find({
      $and: [
        {
          $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        }
      ]
    }).sort({ createdAt: 1 });

    // Format + Decrypt messages for the current user
    const formattedMessages = messages.map(msg => {
      const plainObject = msg.toObject();

      if (msg.isDeleted || msg.deletedFor.includes(userId)) {
        return {
          ...plainObject,
          text: "deleted message",
          image: null
        };
      }

      // 🔑 decrypt only if text exists
      return {
        ...plainObject,
        text: msg.text ? decrypt(msg.text) : "",
      };
    });

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to load messages" });
  }
};


export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: encrypt(text),   // 🔒 encrypt before saving
      image,
    });

    // Decrypt before sending back
    const safeMessage = {
      ...newMessage.toObject(),
      text: decrypt(newMessage.text),
    };

    const receiverSocketId = getReceiverSocketId(receiverId);
    const senderSocketId = getReceiverSocketId(senderId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", safeMessage);
    }
    if (senderSocketId) {
      io.to(senderSocketId).emit("newMessage", safeMessage);
    }

    res.status(201).json(safeMessage);
  } catch (err) {
    res.status(500).json({ message: "Error sending message", error: err.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const currentUserId = req.user._id.toString();

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Push current user's ID to deletedFor if not already present
    if (!message.deletedFor.includes(currentUserId)) {
      message.deletedFor.push(currentUserId);
    }

    // If both sender and receiver deleted, mark as globally deleted
    const senderId = message.senderId.toString();
    const receiverId = message.receiverId.toString();
    if (message.deletedFor.includes(senderId) && message.deletedFor.includes(receiverId)) {
      message.isDeleted = true;
    }

    await message.save();

    // Prepare message for response (only for current user)
    const responseMessage = {
      ...message.toObject(),
      text: "deleted message",
      image: null
    };

    // Emit socket events
    const senderSocketId = getReceiverSocketId(senderId);
    const receiverSocketId = getReceiverSocketId(receiverId);

    if (senderSocketId) io.to(senderSocketId).emit("messageDeleted", responseMessage);
    if (receiverSocketId) io.to(receiverSocketId).emit("messageDeleted", responseMessage);

    res.status(200).json({ message: "Message deleted for current user", data: responseMessage });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};



export const editMessage = async (req, res) => {
  try {
    const { text } = req.body;

    // 🔒 Encrypt new text before saving
    const encryptedText = encrypt(text);

    const updatedMessage = await Message.findByIdAndUpdate(
      req.params.id,
      { text: encryptedText, edited: true, editedAt: new Date() },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({ error: "Message not found" });
    }

    // 🔑 Decrypt before sending back
    const decryptedMessage = {
      ...updatedMessage.toObject(),
      text: text, // return original plain text to client
    };

    const senderSocketId = getReceiverSocketId(updatedMessage.senderId.toString());
    const receiverSocketId = getReceiverSocketId(updatedMessage.receiverId.toString());

    if (senderSocketId) {
      io.to(senderSocketId).emit("messageEdited", decryptedMessage);
    }
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageEdited", decryptedMessage);
    }

    res.status(200).json(decryptedMessage);
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ error: "Failed to edit message" });
  }
};
