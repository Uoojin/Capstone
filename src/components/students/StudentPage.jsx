import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import studentData from '../../data/StudentDemo.json';
import '../students/StudentPage.css';

const ROLES = ['ALL', 'DESIGNER', 'PLANNER', 'PROGRAMMER'];

const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export default function StudentPage() {
    const [activeRole, setActiveRole] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    // 카드 플립
    const [flippedCards, setFlippedCards] = useState({});

  
    const [floatingY, setFloatingY] = useState(0);
    const sidebarRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            const startThreshold = 60;

            if (window.scrollY > startThreshold) {
                let moveY = window.scrollY - startThreshold + 30;

                if (sidebarRef.current && menuRef.current) {
                    const maxMove = sidebarRef.current.offsetHeight - menuRef.current.offsetHeight;
                    if (moveY > maxMove) {
                        moveY = Math.max(0, maxMove);
                    }
                }
                setFloatingY(moveY);
            } else {
                setFloatingY(0);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    
    const handleCardFlip = (studentId) => {
        setFlippedCards((prev) => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

    // 카드 뒷면 (프로젝트)
    const handleProjectClick = (e, projectId) => {
        e.stopPropagation();
        navigate(`/projects/${projectId || 'team-01'}`);
    };

    // 카드 뒷면 (프로필링크)
    const handleLinkClick = (e, url) => {
        e.stopPropagation();
        window.open(url || 'https://google.com', '_blank', 'noopener,noreferrer');
    };

    // 검색
    const displayStudents = useMemo(() => {
        let filtered = studentData;

        if (activeRole !== 'ALL') {
            filtered = filtered.filter((student) => student.role === activeRole);
        }

        if (searchTerm.trim() !== '') {
            filtered = filtered.filter((student) =>
                student.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
            );
        }

        const remainder = filtered.length % 4;
        const emptyCount = remainder === 0 ? 0 : 4 - remainder;

        const emptySlots = Array.from({ length: emptyCount }).map((_, idx) => ({
            isEmpty: true,
            id: `empty-student-${idx}`
        }));

        const combined = [...filtered, ...emptySlots];
        return shuffleArray(combined);
    }, [activeRole, searchTerm]);

    return (
        <div className="student-page-container">
            {/* 좌측 */}
            <aside className="student-sidebar" ref={sidebarRef}>
                <div
                    className="student-floating-menu"
                    ref={menuRef}
                    style={{ transform: `translateY(${floatingY}px)` }}
                >
                    {/* 검색 */}
                    <div className="student-search-box">
                        <input
                            type="text"
                            placeholder="SEARCH"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="student-search-input"
                        />
                        <svg
                            className="search-icon"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>

                    {/* 카테고리 리스트 */}
                    <div className="role-group">
                        {ROLES.map((role) => (
                            <button
                                key={role}
                                className={`role-btn ${activeRole === role ? 'active' : ''}`}
                                onClick={() => setActiveRole(role)}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* 우측*/}
            <main className="student-content">
                <div className="student-grid">
                    {displayStudents.map((item) =>
                        item.isEmpty ? (
                            <div key={item.id} className="student-empty-card" />
                        ) : (
                            <div key={item.studentId} className="student-card">
                                
                                <div
                                    className={`student-flipper ${flippedCards[item.studentId] ? 'flipped' : ''}`}
                                    onClick={() => handleCardFlip(item.studentId)}
                                >
                                    {/* 카드 앞 */}
                                    <div className="card-face card-front">
                                        <div className="student-img-placeholder"></div>
                                    </div>

                                    {/* 카드 뒤 */}
                                    <div className="card-face card-back">
                                        <p className="back-interview">
                                            {item.interview || '인사말 혹은 짧은 인터뷰 내용이 들어가는 영역입니다.'}
                                        </p>

                                        <div className="back-meta-list">
                                            <div className="back-meta-row">
                                                <span className="back-label">Contact</span>
                                                <span className="back-value">{item.contact || 'xxxxxxxx@gmail.com'}</span>
                                            </div>
                                            <div className="back-meta-row">
                                                <span className="back-label">Profile</span>
                                                <span
                                                    className="back-link"
                                                    onClick={(e) => handleLinkClick(e, item.profileUrl)}
                                                >
                                                    site &gt;
                                                </span>
                                            </div>
                                            <div className="back-meta-row">
                                                <span className="back-label">Project</span>
                                                <span
                                                    className="back-link"
                                                    onClick={(e) => handleProjectClick(e, item.projectId)}
                                                >
                                                    {item.project || 'project name'} &gt;
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 카드 하단 */}
                                <div className="student-info">
                                    <h4 className="student-name">{item.name}</h4>
                                    <p className="student-meta">
                                        {item.project} | {item.role}
                                    </p>
                                </div>
                            </div>
                        )
                    )}
                </div>
            </main>
        </div>
    );
}