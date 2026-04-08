import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, orderBy, limit, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { 
  MessageSquare, 
  Send, 
  Search, 
  UserPlus, 
  MoreVertical, 
  Paperclip, 
  Smile,
  Check,
  CheckCheck,
  Clock,
  User,
  X,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Conversation, Message, UserProfile } from '../types';

export default function Messages() {
  const { profile, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Conversations
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
      setConversations(convs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Fetch Messages for Selected Conversation
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, `conversations/${selectedConv.id}/messages`),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `conversations/${selectedConv.id}/messages`);
    });

    return () => unsubscribe();
  }, [selectedConv]);

  // Search Users for New Chat
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('displayName', '>=', userSearchTerm),
          where('displayName', '<=', userSearchTerm + '\uf8ff'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs
          .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
          .filter(u => u.uid !== user?.uid);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [userSearchTerm, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConv || !user) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      const msgData = {
        conversationId: selectedConv.id,
        senderId: user.uid,
        text,
        createdAt: serverTimestamp(),
        readBy: [user.uid]
      };

      await addDoc(collection(db, `conversations/${selectedConv.id}/messages`), msgData);

      await updateDoc(doc(db, 'conversations', selectedConv.id), {
        lastMessage: {
          text,
          senderId: user.uid,
          createdAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `conversations/${selectedConv.id}/messages`);
    }
  };

  const startNewConversation = async (targetUser: UserProfile) => {
    if (!user || !profile) return;

    // Check if conversation already exists
    const existing = conversations.find(c => 
      c.participants.length === 2 && c.participants.includes(targetUser.uid)
    );

    if (existing) {
      setSelectedConv(existing);
      setIsNewChatModalOpen(false);
      return;
    }

    try {
      const convId = [user.uid, targetUser.uid].sort().join('_');
      const convData: Partial<Conversation> = {
        participants: [user.uid, targetUser.uid],
        participantDetails: {
          [user.uid]: {
            displayName: profile.displayName,
            photoURL: profile.photoURL || '',
            role: profile.role
          },
          [targetUser.uid]: {
            displayName: targetUser.displayName,
            photoURL: targetUser.photoURL || '',
            role: targetUser.role
          }
        },
        updatedAt: serverTimestamp(),
        unreadCount: {
          [user.uid]: 0,
          [targetUser.uid]: 0
        }
      };

      await setDoc(doc(db, 'conversations', convId), convData);
      setSelectedConv({ id: convId, ...convData } as Conversation);
      setIsNewChatModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'conversations');
    }
  };

  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participants.find(id => id !== user?.uid);
    return otherId ? conv.participantDetails[otherId] : null;
  };

  return (
    <div className="h-[calc(100vh-12rem)] bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex">
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col bg-slate-50/30",
        selectedConv && "hidden md:flex"
      )}>
        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-4 p-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-slate-200 rounded-full" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-900 font-bold">No messages yet</p>
              <p className="text-slate-400 text-sm mt-1">Start a conversation with a colleague or student.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {conversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const isActive = selectedConv?.id === conv.id;
                return (
                  <button 
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 transition-all hover:bg-white text-left group relative",
                      isActive ? "bg-white" : "bg-transparent"
                    )}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />}
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                        <img 
                          src={other?.photoURL || `https://ui-avatars.com/api/?name=${other?.displayName || 'User'}&background=random`} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 truncate">{other?.displayName}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {conv.updatedAt?.toDate ? new Date(conv.updatedAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate font-medium">
                        {conv.lastMessage?.senderId === user?.uid && 'You: '}
                        {conv.lastMessage?.text || 'Start a conversation'}
                      </p>
                    </div>
                    {conv.unreadCount?.[user?.uid || ''] > 0 && (
                      <div className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-blue-200">
                        {conv.unreadCount[user?.uid || '']}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-white relative",
        !selectedConv && "hidden md:flex"
      )}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedConv(null)}
                  className="md:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                  <img 
                    src={getOtherParticipant(selectedConv)?.photoURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(selectedConv)?.displayName || 'User'}&background=random`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-none">{getOtherParticipant(selectedConv)?.displayName}</h3>
                  <p className="text-xs text-emerald-500 font-bold mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                  <Search className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?.uid;
                const showAvatar = i === 0 || messages[i-1].senderId !== msg.senderId;
                
                return (
                  <div 
                    key={msg.id}
                    className={cn(
                      "flex items-end gap-3",
                      isMe ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    {!isMe && (
                      <div className="w-8 h-8 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                        {showAvatar && (
                          <img 
                            src={getOtherParticipant(selectedConv)?.photoURL || `https://ui-avatars.com/api/?name=${getOtherParticipant(selectedConv)?.displayName || 'User'}&background=random`} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[75%] space-y-1",
                      isMe ? "items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-sm font-medium shadow-sm",
                        isMe 
                          ? "bg-blue-600 text-white rounded-br-none" 
                          : "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                      )}>
                        {msg.text}
                      </div>
                      <div className={cn(
                        "flex items-center gap-2 px-1",
                        isMe ? "flex-row-reverse" : "flex-row"
                      )}>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {isMe && (
                          <CheckCheck className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button type="button" className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button type="button" className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50 disabled:shadow-none"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/30">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-8">
              <MessageSquare className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Select a conversation</h3>
            <p className="text-slate-500 max-w-xs mx-auto">
              Choose a person from the sidebar or start a new chat to begin messaging.
            </p>
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="mt-8 flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
            >
              <UserPlus className="w-5 h-5" />
              Start New Chat
            </button>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {isNewChatModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewChatModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">New Message</h3>
                <button 
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder="Search users by name..."
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                    autoFocus
                  />
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {searching ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((u) => (
                      <button 
                        key={u.uid}
                        onClick={() => startNewConversation(u)}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all group text-left"
                      >
                        <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                          <img 
                            src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{u.displayName}</p>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{u.role}</p>
                        </div>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                          <Send className="w-4 h-4" />
                        </div>
                      </button>
                    ))
                  ) : userSearchTerm.length >= 2 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">No users found matching "{userSearchTerm}"</p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm">Type at least 2 characters to search</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
