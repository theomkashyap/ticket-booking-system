import { PublicNavbar } from '@/app/components/Navbar';
import LoadingMessage from '@/app/components/LoadingMessage';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicNavbar  />
      <main className="page-main flex-1 flex flex-col items-center justify-center min-h-[50vh] ">
        <LoadingMessage variant="page" />
      </main>
    </div>
  );
}
