import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, OperationType, handleFirestoreError } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import { 
  Library as LibraryIcon, 
  Search, 
  Book, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  History, 
  Bookmark,
  ExternalLink,
  Info,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Modal from '../components/Modal';

export default function Library() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'catalog' | 'my-books' | 'holds'>('catalog');
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<any[]>([]);
  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'libraryBooks'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setBooks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'libraryBooks'));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'libraryLoans'), where('studentId', '==', profile.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const loans = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // For each loan, we'd ideally fetch the book details too
      // For simplicity in this UI, we'll assume book details are denormalized or fetched separately
      setMyBooks(loans);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'libraryLoans'));
    return () => unsubscribe();
  }, [profile]);

  const handleReserve = async () => {
    if (!selectedBook || !profile) return;
    setLoading(true);
    try {
      // Create a loan record
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks loan

      await addDoc(collection(db, 'libraryLoans'), {
        bookId: selectedBook.id,
        studentId: profile.uid,
        title: selectedBook.title, // Denormalizing for UI
        borrowedDate: new Date().toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        status: 'active',
        createdAt: serverTimestamp()
      });

      // Update book availability
      await updateDoc(doc(db, 'libraryBooks', selectedBook.id), {
        available: false
      });

      setIsReserveModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'libraryLoans');
    } finally {
      setLoading(false);
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.isbn?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">University Library</h1>
          <p className="text-slate-500 mt-1">Access digital resources and manage physical loans</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
            <ExternalLink className="w-4 h-4" />
            <span>Digital Repository</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Book className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Books Borrowed</p>
              <p className="text-2xl font-bold text-slate-900">2</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Account Status</p>
              <p className="text-2xl font-bold text-emerald-600">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Library Fines</p>
              <p className="text-2xl font-bold text-amber-600">0.00 LYD</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
        <button 
          onClick={() => setActiveTab('catalog')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all",
            activeTab === 'catalog' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          Book Catalog
        </button>
        <button 
          onClick={() => setActiveTab('my-books')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all",
            activeTab === 'my-books' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          My Loans
        </button>
        <button 
          onClick={() => setActiveTab('holds')}
          className={cn(
            "px-6 py-2 rounded-xl font-bold transition-all",
            activeTab === 'holds' ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          Holds & Restrictions
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {activeTab === 'catalog' && (
          <div className="p-6 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by title, author, or ISBN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBooks.map((book) => (
                <div key={book.id} className="p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                      <Book className="w-6 h-6" />
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                      book.available ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {book.available ? 'Available' : 'Borrowed'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{book.title}</h4>
                  <p className="text-sm text-slate-500 mt-1">{book.author}</p>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">{book.location}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedBook(book)}
                        className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedBook(book);
                          setIsReserveModalOpen(true);
                        }}
                        disabled={!book.available}
                        className={cn(
                          "text-sm font-bold transition-all",
                          book.available ? "text-blue-600 hover:underline" : "text-slate-300 cursor-not-allowed"
                        )}
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'my-books' && (
          <div className="divide-y divide-slate-50">
            {myBooks.map((book) => (
              <div key={book.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center",
                    book.status === 'overdue' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                  )}>
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{book.title}</h4>
                    <p className="text-sm text-slate-500">Due: {book.dueDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {book.status === 'overdue' && (
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Overdue</span>
                  )}
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                    Renew
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'holds' && (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No Active Holds</h3>
            <p className="text-slate-500 mt-2 max-w-md">
              Your library account is in good standing. You have no overdue books or unpaid fines that would restrict your academic activities.
            </p>
          </div>
        )}
      </div>

      {/* Book Details Modal */}
      <Modal
        isOpen={!!selectedBook && !isReserveModalOpen}
        onClose={() => setSelectedBook(null)}
        title="Book Details"
      >
        {selectedBook && (
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="w-32 h-44 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                <Book className="w-12 h-12" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900">{selectedBook.title}</h3>
                <p className="text-slate-500 mt-1">{selectedBook.author}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg uppercase">{selectedBook.category}</span>
                  <span className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-lg uppercase",
                    selectedBook.available ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {selectedBook.available ? 'Available' : 'Borrowed'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ISBN</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{selectedBook.isbn}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{selectedBook.location}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pages</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{selectedBook.pages}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year</p>
                <p className="text-sm font-bold text-slate-900 mt-1">{selectedBook.year}</p>
              </div>
            </div>

            <button 
              onClick={() => setIsReserveModalOpen(true)}
              disabled={!selectedBook.available}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              Reserve this Book
            </button>
          </div>
        )}
      </Modal>

      {/* Reserve Confirmation Modal */}
      <Modal
        isOpen={isReserveModalOpen}
        onClose={() => setIsReserveModalOpen(false)}
        title="Confirm Reservation"
        footer={
          <>
            <button 
              onClick={() => setIsReserveModalOpen(false)}
              className="px-6 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleReserve}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading && <Clock className="w-4 h-4 animate-spin" />}
              Confirm Reservation
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-slate-600">You are about to reserve the following book:</p>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
            <Book className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-bold text-slate-900">{selectedBook?.title}</p>
              <p className="text-xs text-blue-600 font-bold">{selectedBook?.author}</p>
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Reservations are held for 48 hours. If you do not pick up the book within this period, the reservation will be cancelled.
            </p>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Reservation Successful"
      >
        <div className="text-center py-6">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Book Reserved!</h3>
          <p className="text-slate-500 mt-2">
            Your reservation for <span className="font-bold text-slate-900">"{selectedBook?.title}"</span> has been confirmed. Please pick it up at the main library desk within 48 hours.
          </p>
          <button 
            onClick={() => {
              setIsSuccessModalOpen(false);
              setSelectedBook(null);
            }}
            className="mt-8 w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all"
          >
            Got it
          </button>
        </div>
      </Modal>
    </div>
  );
}
