import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectCard from '../projects/ProjectCard';
import mockData from '../../data/ProjectDemo.json';
import '../projects/ProjectPage.css';

// 카테고리
const CATEGORY_GROUPS = [
  {
    id: 'medium',
    name: 'MEDIA',
    subCategories: ['APP', 'WEB', '미디어월', '키오스크', '영상']
  },
  {
    id: 'subject',
    name: 'SUBJECT',
    subCategories: ['건강/의료', '공공행정', '교육/학습', '금융/소비', '자연/환경']
  },
  {
    id: 'target',
    name: 'TARGET',
    subCategories: ['대학생/청년', '아동/청소년', '시니어', '외국인', '시민']
  }
];


const shuffleWithGuaranteedStart = (filteredProjects, emptySlots) => {
  if (filteredProjects.length < 2) {
    return [...filteredProjects, ...emptySlots];
  }

  const shuffledProjects = [...filteredProjects];
  for (let i = shuffledProjects.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledProjects[i], shuffledProjects[j]] = [shuffledProjects[j], shuffledProjects[i]];
  }

  const guaranteedStart = shuffledProjects.slice(0, 2);
  const remainingPool = [...shuffledProjects.slice(2), ...emptySlots];

  for (let i = remainingPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingPool[i], remainingPool[j]] = [remainingPool[j], remainingPool[i]];
  }

  return [...guaranteedStart, ...remainingPool];
};

export default function ProjectPage() {
  const [openGroupId, setOpenGroupId] = useState(null);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const navigate = useNavigate();

  const [floatingY, setFloatingY] = useState(0);
  const sidebarRef = useRef(null); 
  const listRef = useRef(null);
  const categoryGroupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryGroupRef.current && !categoryGroupRef.current.contains(e.target)) {
        setOpenGroupId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const listTop = listRef.current ? listRef.current.offsetTop : 200;
      const headerOffset = 104;
      const triggerPoint = listTop - headerOffset;

      if (window.scrollY > triggerPoint) {
        let moveY = window.scrollY - triggerPoint;

        if (sidebarRef.current && listRef.current) {
          const maxMove = sidebarRef.current.offsetHeight - listRef.current.offsetHeight - listTop;
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
  }, [openGroupId]);

  const handleToggleGroup = (groupId) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleSelectSubCategory = (sub) => {
    if (!selectedSubCategories.includes(sub)) {
      setSelectedSubCategories((prev) => [...prev, sub]);
    }
  };

  const handleRemoveTag = (sub) => {
    setSelectedSubCategories((prev) => prev.filter((item) => item !== sub));
  };

  const handleClearAll = () => {
    setSelectedSubCategories([]);
  };

  const displayProjects = useMemo(() => {
    let filtered = mockData;

    if (selectedSubCategories.length > 0) {
      filtered = mockData.filter((project) =>
        selectedSubCategories.some(
          (cat) =>
            project.medium === cat ||
            project.subject === cat ||
            project.target === cat ||
            project.category === cat ||
            project.title.includes(cat)
        )
      );
    }

    const remainder = filtered.length % 4;
    const emptyCount = remainder === 0 ? 0 : 4 - remainder;

    const emptySlots = Array.from({ length: emptyCount }).map((_, idx) => ({
      isEmpty: true,
      id: `empty-${selectedSubCategories.join('-') || 'all'}-${idx}`
    }));

    return shuffleWithGuaranteedStart(filtered, emptySlots);
  }, [selectedSubCategories]);

  return (
    <div className="project-page-container">
      <aside className="project-sidebar" ref={sidebarRef}>
        <div className="category-group" ref={categoryGroupRef}>
          {CATEGORY_GROUPS.map((group) => {
            const isOpen = openGroupId === group.id;
            const availableSubCategories = group.subCategories.filter(
              (sub) => !selectedSubCategories.includes(sub)
            );

            return (
              <div key={group.id} className="category-accordion-item">
                <button
                  className="category-btn"
                  onClick={() => handleToggleGroup(group.id)}
                >
                  <span className={`accordion-arrow ${isOpen ? 'open' : ''}`}>›</span>
                  <span className="category-btn-text">{group.name}</span>
                </button>

                {isOpen && availableSubCategories.length > 0 && (
                  <div className="sub-category-list animated-open">
                    {availableSubCategories.map((sub) => (
                      <button
                        key={sub}
                        className="sub-category-btn"
                        onClick={() => handleSelectSubCategory(sub)}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sidebar-divider"></div>

        <div 
          className="sidebar-project-list"
          ref={listRef}
          style={{ transform: `translateY(${floatingY}px)` }}
        >
          {mockData.map((project, index) => {
            const num = String(index + 1).padStart(2, '0'); 
            return (
              <div 
                key={project.teamId} 
                className="sidebar-list-item"
                onClick={() => navigate(`/projects/${project.teamId}`)}
              >
                <span className="item-num">{num}</span>
                <span className="item-name">{project.title}</span>
              </div>
            );
          })}
        </div>
      </aside>

      <main className="project-content">
        {selectedSubCategories.length > 0 && (
          <div className="filter-header-bar">
            <div className="selected-tags-group">
              {selectedSubCategories.map((sub) => (
                <div key={sub} className="selected-tag">
                  <span>{sub}</span>
                  <button className="tag-remove-btn" onClick={() => handleRemoveTag(sub)}>✕</button>
                </div>
              ))}
            </div>
            <button className="clear-all-btn" onClick={handleClearAll}>
              Clear All
            </button>
          </div>
        )}

        <div className="project-grid">
          {displayProjects.map((item) => (
            item.isEmpty ? (
              <div key={item.id} className="empty-card"></div>
            ) : (
              <ProjectCard key={item.teamId} project={item} />
            )
          ))}
        </div>
      </main>
    </div>
  );
}