import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/Navbar';

export default async function StudentLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userRole = user.user_metadata?.role || 'student';
  if (userRole !== 'student') {
    redirect('/login');
  }

  const studentProfile = {
    id: user.id,
    full_name: user.user_metadata?.full_name || 'Student',
    role: 'student',
    subject: user.user_metadata?.subject || 'mern'
  };

  return (
    <div className="dashboard-layout">
      <Navbar user={studentProfile} />
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}
