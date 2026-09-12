import { BrowserRouter, Routes, Outlet, Route, Navigate, useNavigate } from 'react-router-dom';
import Header from './components/common/Header';
import ProjectPage from '../src/components/projects/ProjectPage';
import ProjectDetailPage from '../src/components/projects/ProjectDetailPage';
import StudentPage from '../src/components/students/StudentPage';
// import StudentDetailPage from '../src/components/students/StudentDetailPage';
import GuestBookPage from '../src/components/guestbook/GuestBookPage';
import PhotoBoothPage from '../src/components/guestbook/PhotoBoothPage';
import ContentPage from '../src/components/Editor/DrawingEditor';
import Archive from '../src/components/Archive/ArchiveCanvas';


function WithHeaderLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

function ContentPageWithNavigation() {
  const navigate = useNavigate();

  return <ContentPage onNavigateToArchive={() => navigate('/archive')} />;
}

function ArchivePageWithNavigation() {
  const navigate = useNavigate();

  return <Archive onNavigateToEditor={() => navigate('/content')} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* with header */}
        <Route element={<WithHeaderLayout />}>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectPage />} />
          <Route path="/students" element={<StudentPage />} />
          <Route path="/guestbook" element={<GuestBookPage />} />
          <Route path="/photobooth" element={<PhotoBoothPage />} />
          <Route path="/content" element={<ContentPageWithNavigation />} />
        </Route>

        {/* without header */}
        <Route path="/projects/:teamId" element={<ProjectDetailPage />} />
        <Route path="/archive" element={<ArchivePageWithNavigation />} />
        {/* <Route path="/students/:studentId" element={<StudentDetailPage />} /> */}

      </Routes>
    </BrowserRouter>
  );
}

export default App;
