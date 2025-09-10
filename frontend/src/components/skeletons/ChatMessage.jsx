import { useState, useRef, useEffect } from 'react';

const ChatMessage = ({ message, onDelete, onEdit }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef();

  const handleContextMenu = (e) => {
    e.preventDefault();
    setPosition({ x: e.pageX, y: e.pageY });
    setMenuVisible(true);
  };

  const handleClickOutside = (e) => {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setMenuVisible(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div onContextMenu={handleContextMenu} className="relative">
      <div className="bg-black text-white p-2 rounded-lg w-fit">{message.text}</div>

      {menuVisible && (
        <ul
          ref={menuRef}
          className="absolute bg-white border rounded shadow text-black z-50"
          style={{ top: position.y, left: position.x }}
        >
          <li onClick={() => onEdit(message._id)} className="p-2 hover:bg-gray-100 cursor-pointer">Edit</li>
          <li onClick={() => onDelete(message._id)} className="p-2 hover:bg-red-100 cursor-pointer">Delete</li>
        </ul>
      )}
    </div>
  );
};

export default ChatMessage;
