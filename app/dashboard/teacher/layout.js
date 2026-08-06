import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default async function TeacherDashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userRole = user.user_metadata?.role || 'teacher';
  if (userRole !== 'teacher' && userRole !== 'admin') {
    redirect('/login');
  }

  const teacherProfile = {
    id: user.id,
    full_name: user.user_metadata?.full_name || 'Instructor',
    role: 'teacher',
    subject: user.user_metadata?.subject
  };

  return (
    <div className="dashboard-layout">
      <Navbar user={teacherProfile} />
      <main className="dashboard-content">
        {children}
      </main>
    </div>
  );
}
