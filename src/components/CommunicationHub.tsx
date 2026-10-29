import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { InternalMessage, GroupPost } from '../types';
import {
  MessageSquare,
  Users,
  Send,
  Pin,
  Trash2,
  CheckCircle2,
  Clock,
  Plus,
  Paperclip,
  Bell,
  Search,
  User,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import { getTeachersForStudent } from '../utils/studentVisibility';

export const CommunicationHub: React.FC = () => {
  const {
    currentUser,
    users,
    groups,
    courses,
    ecs,
    sessions,
    internalMessages,
    groupPosts,
    sendMessage,
    markMessageAsRead,
    createGroupPost,
    deleteGroupPost,
  } = useApp();

  const isStudent = currentUser.role === 'STUDENT';
  const isStaff = ['ADMIN', 'TEACHER', 'ACADEMIC_HEAD', 'SCHEDULER'].includes(currentUser.role);

  const [activeTab, setActiveTab] = useState<'MESSAGES' | 'WALL'>('WALL');

  // Messaging state
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('');
  const [selectedRecipientGroupId, setSelectedRecipientGroupId] = useState<string>('');
  const [messageSubject, setMessageSubject] = useState<string>('');
  const [messageContent, setMessageContent] = useState<string>('');
  const [messageSendNotice, setMessageSendNotice] = useState<string | null>(null);

  // Group Wall state: For student, strictly locked to their enrolled group
  const effectiveGroupId = isStudent
    ? (currentUser.groupId || 'grp-l1-info-a')
    : (currentUser.groupId || groups[0]?.id || 'grp-l1-info-a');

  const [selectedGroupId, setSelectedGroupId] = useState<string>(effectiveGroupId);
  const [showNewPostModal, setShowNewPostModal] = useState<boolean>(false);
  const [postForm, setPostForm] = useState({
    title: '',
    content: '',
    category: 'ANNOUNCEMENT' as GroupPost['category'],
    isPinned: false,
  });

  // Calculate teachers who actively teach this student's group
  const studentTeachers = getTeachersForStudent(currentUser.groupId, courses, ecs, sessions, users);

  // Filter messages for current user
  const myMessages = internalMessages.filter(
    (m) =>
      m.senderId === currentUser.id ||
      m.recipientId === currentUser.id ||
      (m.recipientGroupId && m.recipientGroupId === currentUser.groupId) ||
      (!m.recipientId && !m.recipientGroupId)
  );

  // Target group ID strictly enforced
  const activeWallGroupId = isStudent ? (currentUser.groupId || 'grp-l1-info-a') : selectedGroupId;
  const currentGroupPosts = groupPosts.filter((p) => p.groupId === activeWallGroupId);

  const myEnrolledGroup = groups.find((g) => g.id === currentUser.groupId);


  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    sendMessage({
      recipientId: selectedRecipientId || undefined,
      recipientGroupId: selectedRecipientGroupId || undefined,
      subject: messageSubject || 'Sans objet',
      content: messageContent,
    });

    setMessageSubject('');
    setMessageContent('');
    setSelectedRecipientId('');
    setSelectedRecipientGroupId('');
    setMessageSendNotice('Message envoyé avec succès !');
    setTimeout(() => setMessageSendNotice(null), 3000);
  };

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postForm.title.trim() || !postForm.content.trim()) return;

    createGroupPost({
      groupId: selectedGroupId,
      title: postForm.title,
      content: postForm.content,
      category: postForm.category,
      isPinned: postForm.isPinned,
    });

    setShowNewPostModal(false);
    setPostForm({
      title: '',
      content: '',
      category: 'ANNOUNCEMENT',
      isPinned: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded text-xs font-semibold uppercase">
              Espace Collaboratif EBM
            </span>
            <span className="text-xs text-slate-300">Communication & Notifications Directes</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Messagerie Interne & Mur de Promotion</h1>
          <p className="text-slate-300 text-sm mt-1">
            Échangez directement entre étudiants et enseignants, publiez des annonces de groupe et consultez les avis officiels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'WALL' && isStaff && (
            <button
              onClick={() => setShowNewPostModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Annonce
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('WALL')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'WALL'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Mur de Promotion & Annonces ({currentGroupPosts.length})
        </button>
        <button
          onClick={() => setActiveTab('MESSAGES')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'MESSAGES'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Messagerie Interne ({myMessages.filter((m) => !m.isRead && m.senderId !== currentUser.id).length} non lus)
        </button>
      </div>

      {/* TAB 1: GROUP WALL */}
      {activeTab === 'WALL' && (
        <div className="space-y-6">
          {/* Group Selector Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isStudent ? (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    Mur de votre promotion :
                  </span>
                  <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    {myEnrolledGroup ? `${myEnrolledGroup.code} • ${myEnrolledGroup.name}` : 'Votre groupe inscrit'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (Accès strictement réservé à votre groupe)
                  </span>
                </div>
              ) : (
                <>
                  <span className="text-xs font-bold text-slate-500 uppercase">Afficher le mur du groupe :</span>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.code} ({g.name})
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {isStaff && (
              <button
                onClick={() => setShowNewPostModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Publier
              </button>
            )}
          </div>

          {/* Posts List */}
          <div className="space-y-4">
            {currentGroupPosts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">Aucune publication sur le mur de ce groupe pour le moment.</p>
              </div>
            ) : (
              currentGroupPosts.map((post) => {
                return (
                  <div
                    key={post.id}
                    className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 transition-all ${
                      post.isPinned ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {post.authorName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">{post.authorName}</span>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                              {post.authorRole}
                            </span>
                            {post.isPinned && (
                              <span className="flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                                <Pin className="w-3 h-3 text-amber-600" />
                                Épinglé
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(post.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            post.category === 'EXAM'
                              ? 'bg-rose-100 text-rose-800'
                              : post.category === 'HOMEWORK'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {post.category}
                        </span>

                        {(isStaff || post.authorId === currentUser.id) && (
                          <button
                            onClick={() => deleteGroupPost(post.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                            title="Supprimer la publication"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-bold text-sm text-slate-800">{post.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{post.content}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MESSAGING */}
      {activeTab === 'MESSAGES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Send Message Form */}
          <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Écrire un Nouveau Message</h3>

            {messageSendNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{messageSendNotice}</span>
              </div>
            )}

            <form onSubmit={handleSendMessageSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  {isStudent ? "Enseignant référent ou Direction :" : "Destinataire individuel :"}
                </label>
                <select
                  value={selectedRecipientId}
                  onChange={(e) => {
                    setSelectedRecipientId(e.target.value);
                    if (e.target.value) setSelectedRecipientGroupId('');
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                >
                  <option value="">
                    {isStudent
                      ? "-- Choisir parmi vos enseignants ou la direction --"
                      : "-- Choisir un utilisateur précis --"}
                  </option>
                  {isStudent ? (
                    <>
                      <optgroup label="Vos Enseignants (Promotion)">
                        {studentTeachers.length === 0 ? (
                          <option disabled value="">Aucun enseignant assigné à votre groupe</option>
                        ) : (
                          studentTeachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} (Enseignant de votre groupe)
                            </option>
                          ))
                        )}
                      </optgroup>
                      <optgroup label="Direction & Scolarité">
                        {users
                          .filter((u) => ['ADMIN', 'ACADEMIC_HEAD'].includes(u.role))
                          .map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.name} ({admin.role === 'ADMIN' ? 'Administration' : 'Responsable Pédagogique'})
                            </option>
                          ))}
                      </optgroup>
                    </>
                  ) : (
                    users
                      .filter((u) => u.id !== currentUser.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))
                  )}
                </select>
                {isStudent && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Conformément aux règles de sécurité, vous ne pouvez échanger qu'avec vos enseignants et la scolarité.
                  </p>
                )}
              </div>

              {isStaff && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Ou diffuser à un groupe entier :</label>
                  <select
                    value={selectedRecipientGroupId}
                    onChange={(e) => {
                      setSelectedRecipientGroupId(e.target.value);
                      if (e.target.value) setSelectedRecipientId('');
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="">-- Aucun groupe sélectionné --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        Promotion {g.code} ({g.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Objet du message :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Question sur le TP d'Algorithmique"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contenu du message :</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Rédigez votre message ici..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
              >
                <Send className="w-4 h-4" />
                Envoyer le message
              </button>
            </form>
          </div>

          {/* Inbox Messages */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Boîte de Réception & Discussions</h3>

            {myMessages.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">
                Aucun message dans votre boîte pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {myMessages.map((msg) => {
                  const isSentByMe = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      onClick={() => !msg.isRead && markMessageAsRead(msg.id)}
                      className={`py-3.5 px-3 rounded-xl transition-colors cursor-pointer ${
                        !msg.isRead && !isSentByMe ? 'bg-blue-50/60 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              !msg.isRead && !isSentByMe ? 'bg-blue-600' : 'bg-transparent'
                            }`}
                          ></span>
                          <span className="font-bold text-slate-800">
                            {isSentByMe ? `À : ${msg.recipientId ? 'Destinataire' : 'Groupe'}` : `De : ${msg.senderName}`}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {msg.senderRole}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(msg.timestamp).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 mt-1">{msg.subject}</div>
                      <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">{msg.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Nouvelle publication mur */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePostSubmit}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Publier sur le mur du groupe</h3>
                <p className="text-xs text-slate-500">
                  Visible par tous les étudiants du groupe {groups.find((g) => g.id === selectedGroupId)?.code}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Titre de l'annonce :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Rappel : Devoir à rendre pour lundi"
                  value={postForm.title}
                  onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Catégorie :</label>
                  <select
                    value={postForm.category}
                    onChange={(e) => setPostForm({ ...postForm, category: e.target.value as GroupPost['category'] })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-semibold"
                  >
                    <option value="ANNOUNCEMENT">Annonce générale</option>
                    <option value="HOMEWORK">Devoirs & Travaux</option>
                    <option value="EXAM">Partiels & Examens</option>
                    <option value="SCHEDULE">Planning & Séances</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="pinCheck"
                    checked={postForm.isPinned}
                    onChange={(e) => setPostForm({ ...postForm, isPinned: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="pinCheck" className="font-semibold text-slate-700 cursor-pointer">
                    Épingler en haut du mur
                  </label>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Texte de la publication :</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Écrivez le message détaillé..."
                  value={postForm.content}
                  onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewPostModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer"
              >
                Publier sur le mur
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
