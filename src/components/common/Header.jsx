import { NavLink } from 'react-router-dom';
import './Header.css';

function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <NavLink to="/projects" className="header-logo">
          HEADER
        </NavLink>

        {/* 메뉴 */}
        <nav className="header-nav">
          <NavLink
            to="/projects"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          > PROJECTS
          </NavLink>
          <NavLink
            to="/students"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          > STUDENTS
          </NavLink>

          <NavLink
            to="/guestbook"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            GUESTBOOK
          </NavLink>

          <NavLink
            to="/content"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            CONTENT
          </NavLink>
        

          
        </nav>
      </div>
    </header>
  );
}

export default Header;