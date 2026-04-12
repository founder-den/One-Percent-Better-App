import { useState } from 'react';
import { useApp }  from '../../context/AppContext.jsx';
import { Card, SectionHeading, EmptyState, Button, Avatar, Badge } from '../../components/ui.jsx';
import { getReadingBooks, saveReadingBooks, formatDate } from '../../services/data.js';

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
      <div className="h-2 rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StudentReadingCard({ student }) {
  const [books, setBooks] = useState(() => getReadingBooks(student.username));

  function removeBook(bookId) {
    if (!window.confirm('Remove this book from the student\'s list?')) return;
    const updated = books.filter(b => b.id !== bookId);
    saveReadingBooks(student.username, updated);
    setBooks(updated);
  }

  if (books.length === 0) return null;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Avatar src={student.avatar} name={student.fullName} size="sm" />
        <div>
          <p className="text-sm font-semibold text-primary">{student.fullName}</p>
          <p className="text-xs text-muted">@{student.username} · {books.length} book{books.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="space-y-3">
        {books.map(b => {
          const pct = b.totalPages > 0
            ? Math.min(100, Math.round((b.currentPage / b.totalPages) * 100))
            : 0;
          return (
            <div key={b.id} className="border border-border rounded-lg p-3 bg-bg-card2">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary">{b.title}</p>
                  {b.author && <p className="text-xs text-muted">{b.author}</p>}
                  {b.lastUpdated && (
                    <p className="text-xs text-muted">Last updated: {formatDate(b.lastUpdated)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={b.status === 'Finished' ? 'success' : 'muted'}>{b.status}</Badge>
                  <Button size="xs" variant="danger" onClick={() => removeBook(b.id)}>Remove</Button>
                </div>
              </div>
              <ProgressBar value={b.currentPage} max={b.totalPages} />
              <p className="text-xs text-muted mt-1">
                p. {b.currentPage} / {b.totalPages} ({pct}%)
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function ReadingTrackerAdminTab() {
  const { students } = useApp();

  const activeStudents = students.filter(s => (s.status || 'active') === 'active');

  // Check which students have any books
  const studentsWithBooks = activeStudents.filter(s => getReadingBooks(s.username).length > 0);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <SectionHeading>Reading Tracker — All Students</SectionHeading>
      </div>

      <p className="text-xs text-muted -mt-3">
        View and manage students' reading lists. You can remove books from a student's list.
      </p>

      {studentsWithBooks.length === 0 ? (
        <EmptyState icon="📚" title="No books yet" text="No students have added books to their reading tracker." />
      ) : (
        <div className="space-y-4">
          {studentsWithBooks.map(s => (
            <StudentReadingCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}
