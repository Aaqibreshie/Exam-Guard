import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navbar from '@/components/Navbar';
import DashboardFooter from '@/components/DashboardFooter';

export default async function StudentLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userRole = user.user_metadata?.role || 'student';
  if (userRole === 'teacher' || userRole === 'admin') {
    redirect('/dashboard/teacher');
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
      <DashboardFooter />
    </div>
  );
}
