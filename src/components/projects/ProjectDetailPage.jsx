import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mockData from '../../data/ProjectDemo.json';
import '../projects/ProjectDetailPage.css';

export default function ProjectDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [draftType, setDraftType] = useState(1);


  const currentIndex = mockData.findIndex((p) => p.teamId === teamId);
  const project = mockData[currentIndex] || mockData[0];

  const prevProject = currentIndex > 0 ? mockData[currentIndex - 1] : mockData[mockData.length - 1];
  const nextProject = currentIndex < mockData.length - 1 ? mockData[currentIndex + 1] : mockData[0];

  const mockDetails = {
    slogan: '프로젝트 슬로건이 들어갑니다',
    description: '프로젝트에 대한 설명이 들어가는 영역입니다. 간단한 기획 의도와 주요 특징을 소개하며 사용자가 프로젝트를 이해할 수 있도록 작성됩니다. 프로젝트에 대한 설명이 들어가는 영역입니다.  간단한 기획 의도와 주요 특징을 소개하며 사용자가 프로젝트를 이해할 수 있도록 작성됩니다.',
    subject: '주제 설명',
    target: '대상 설명',
    medium: '사용 매체',
    siteUrl: 'https://www.google.com',
    handwriting: '손글씨로 작성한 문장이 들어가는 영역입니다.',
    members: [
      { name: '김00', role: 'PLANNER' },
      { name: '김00', role: 'PLANNER' },
      { name: '김00', role: 'DESIGNER' },
      { name: '김00', role: 'DESIGNER' },
      { name: '김00', role: 'DESIGNER' },
      { name: '김00', role: 'PROGRAMMER' },
      { name: '김00', role: 'PROGRAMMER' },
      { name: '김00', role: 'PROGRAMMER' }
    ]
  };

  return (
    <div className={`detail-page-container type-${draftType}`}>

      <div className="draft-tester">
        <button className={draftType === 1 ? 'active' : ''} onClick={() => setDraftType(1)}>시안 1</button>
        <button className={draftType === 2 ? 'active' : ''} onClick={() => setDraftType(2)}>시안 2</button>
        <button className={draftType === 3 ? 'active' : ''} onClick={() => setDraftType(3)}>시안 3</button>
      </div>


      <button className="close-btn" onClick={() => navigate('/projects')}>✕</button>

      {/* 시안 1 ------------------------------------- */}
      {draftType === 1 && (
        <div className="draft-1-layout">
          <div className="left-scroll-area">
            <a
              href={project.siteUrl || mockDetails.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="snap-section work-section"
            >
              <div className="scroll-indicator">
                <span>SCROLL DOWN</span>
                <span className="dot"></span>
              </div>
            </a>
            <div className="snap-section team-img-section">
              <span>팀 이미지 영역</span>
            </div>
            <div className="snap-section extra-img-section">
              <span>기타 이미지 영역</span>
            </div>
          </div>

          <div className="right-fixed-area">
            <div className="info-bottom-wrapper">
              <h1 className="project-title">{project.title || 'PROJECT'}</h1>
              <div className="project-body">
                <h3 className="project-slogan">{project.slogan || mockDetails.slogan}</h3>
                <p className="project-desc">{project.description || mockDetails.description}</p>
                <div className="project-meta">
                  <p><span>주제</span> {project.subject || mockDetails.subject}</p>
                  <p><span>대상</span> {project.target || mockDetails.target}</p>
                  <p><span>매체</span> {project.medium || mockDetails.medium}</p>
                </div>
              </div>
              <hr className="divider" />
              <div className="team-section">
                <h2 className="team-name">{project.teamName || 'TEAM.000'}</h2>
                <div className="members-grid">
                  {(project.members || mockDetails.members).map((member, idx) => (
                    <div key={idx} className="member-item">
                      <span className="member-name">{member.name}</span>
                      <span className="member-role">{member.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시안 2 ------------------------------------- */}

      {draftType === 2 && (
        <div className="draft-2-scroll-wrapper">
          <section className="d2-section top-project-section">
            <a
              href={project.siteUrl || mockDetails.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="d2-work-box"
            >
              <div className="d2-work-bg"></div>
            </a>

            <div className="d2-project-info">
              <h1 className="project-title">{project.title || 'PROJECT'}</h1>
              <h3 className="project-slogan">{project.slogan || mockDetails.slogan}</h3>
              <p className="project-desc">{project.description || mockDetails.description}</p>
              <div className="project-meta">
                <p><span>주제</span> {project.subject || mockDetails.subject}</p>
                <p><span>대상</span> {project.target || mockDetails.target}</p>
                <p><span>매체</span> {project.medium || mockDetails.medium}</p>
              </div>
            </div>
          </section>

          <section className="d2-section bottom-team-section">
            <div className="d2-team-left">
              <div className="team-section">
                <h2 className="team-name">{project.teamName || 'TEAM.000'}</h2>
                <div className="d2-members-grid">
                  {(project.members || mockDetails.members).map((member, idx) => (
                    <div key={idx} className="member-item">
                      <span className="member-name">{member.name}</span>
                      <span className="member-role">{member.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="divider" />

              <div className="d2-handwriting-box">
                <p className="handwriting-text">{project.handwriting || mockDetails.handwriting}</p>
              </div>
            </div>

            <div className="d2-team-right">
              <div className="d2-team-photo-placeholder">
                <span>팀 사진 영역</span>
              </div>
            </div>
          </section>

          <nav className="d2-bottom-nav">
            <button
              className="nav-arrow-btn prev"
              onClick={() => navigate(`/projects/${prevProject.teamId}`)}
            >
              <span className="arrow-title">← PREVIOUS</span>
              <span className="arrow-name">{prevProject.title}</span>
            </button>
            <button
              className="nav-arrow-btn next"
              onClick={() => navigate(`/projects/${nextProject.teamId}`)}
            >
              <span className="arrow-title">NEXT →</span>
              <span className="arrow-name">{nextProject.title}</span>
            </button>
          </nav>
        </div>
      )}

      {/* 시안 3 ------------------------------------- */}
      {draftType === 3 && (
        <div className="draft-3-scroll-wrapper">
          <section className="d3-top-project-section">
            <a
              href={project.siteUrl || mockDetails.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="d3-full-bg-link"
            >
              <div className="d3-full-bg"></div>
            </a>

            <div className="d3-project-info">
              <h1 className="project-title">{project.title || 'PROJECT'}</h1>
              <h3 className="project-slogan">{project.slogan || mockDetails.slogan}</h3>
              <p className="project-desc">{project.description || mockDetails.description}</p>
              <div className="project-meta">
                <p><span>주제</span> {project.subject || mockDetails.subject}</p>
                <p><span>대상</span> {project.target || mockDetails.target}</p>
                <p><span>매체</span> {project.medium || mockDetails.medium}</p>
              </div>
            </div>
          </section>

          <section className="bottom-team-section">
            <div className="d3-team-left">
              <div className="team-section">
                <h2 className="team-name">{project.teamName || 'TEAM.000'}</h2>
                <div className="d3-members-grid">
                  {(project.members || mockDetails.members).map((member, idx) => (
                    <div key={idx} className="member-item">
                      <span className="member-name">{member.name}</span>
                      <span className="member-role">{member.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="divider" />

              <div className="d3-handwriting-box">
                <p className="handwriting-text">{project.handwriting || mockDetails.handwriting}</p>
              </div>
            </div>

            <div className="d3-team-right">
              <div className="d3-team-photo-placeholder">
                <span>팀 사진 영역</span>
              </div>
            </div>
          </section>

          <nav className="d3-bottom-nav">
            <button
              className="nav-arrow-btn prev"
              onClick={() => navigate(`/projects/${prevProject.teamId}`)}
            >
              <span className="arrow-title">← PREVIOUS</span>
              <span className="arrow-name">{prevProject.title}</span>
            </button>
            <button
              className="nav-arrow-btn next"
              onClick={() => navigate(`/projects/${nextProject.teamId}`)}
            >
              <span className="arrow-title">NEXT →</span>
              <span className="arrow-name">{nextProject.title}</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}