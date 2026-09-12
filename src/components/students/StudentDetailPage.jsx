// import { useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import studentData from '../../data/StudentDemo.json';
// import '../students/StudentDetailPage.css';

// export default function StudentDetailPage() {
//   const { studentId } = useParams();
//   const navigate = useNavigate();
//   const [draftType, setDraftType] = useState(1);

//   const student = studentData.find((s) => s.studentId === studentId) || studentData[0];

//   const mockDetail = {
//     interview: '인사말 혹은 짧은 인터뷰 내용이 들어가는 영역입니다.',
//     contact: 'xxxxxxxx@gmail.com',
//     profileUrl: 'https://www.google.com',
//     projectId: 'p01',
//     projectName: student.project || 'project name'
//   };

//   return (
//     <div className={`student-detail-container type-${draftType}`}>
//       {/* 🛠️ 상단 시안 스위처 */}
//       <div className="student-draft-tester">
//         <button className={draftType === 1 ? 'active' : ''} onClick={() => setDraftType(1)}>
//           시안 1
//         </button>
//         <button className={draftType === 2 ? 'active' : ''} onClick={() => setDraftType(2)}>
//           시안 2
//         </button>
//       </div>

//       {/* 우측 상단 고정 X 버튼 */}
//       <button className="student-close-btn" onClick={() => navigate('/students')}>
//         ✕
//       </button>

//       {/* 좌측 프로필 이미지 (공통) */}
//       <div className="student-detail-left">
//         <div className="student-photo-area"></div>
//       </div>

//       {/* =========================================
//           시안 1: 우측 상단/하단 양끝 분리 레이아웃
//       ========================================= */}
//       {draftType === 1 && (
//         <div className="student-detail-right draft-1">
//           <div className="student-top-info">
//             <div className="student-title-row">
//               <h1 className="student-detail-name">{student.name}</h1>
//               <span className="student-detail-role">{student.role}</span>
//             </div>
//             <p className="student-interview">{mockDetail.interview}</p>
//           </div>

//           <div className="student-bottom-info">
//             <div className="student-meta-list">
//               <div className="meta-row">
//                 <span className="meta-label">Contact</span>
//                 <span className="meta-value">{mockDetail.contact}</span>
//               </div>
//               <div className="meta-row">
//                 <span className="meta-label">Profile</span>
//                 <a href={mockDetail.profileUrl} target="_blank" rel="noopener noreferrer" className="meta-link">
//                   site &gt;
//                 </a>
//               </div>
//               <div className="meta-row">
//                 <span className="meta-label">Project</span>
//                 <span className="meta-link" onClick={() => navigate(`/projects/${mockDetail.projectId}`)}>
//                   {mockDetail.projectName} &gt;
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* =========================================
//           시안 2: 우측 중앙 순차 배치 레이아웃
//       ========================================= */}
//       {draftType === 2 && (
//         <div className="student-detail-right draft-2">
//           <div className="student-center-wrapper">
//             <div className="student-title-row">
//               <h1 className="student-detail-name">{student.name}</h1>
//               <span className="student-detail-role">{student.role}</span>
//             </div>
//             <p className="student-interview">{mockDetail.interview}</p>

//             <div className="student-meta-list">
//               <div className="meta-row">
//                 <span className="meta-label">Contact</span>
//                 <span className="meta-value">{mockDetail.contact}</span>
//               </div>
//               <div className="meta-row">
//                 <span className="meta-label">Profile</span>
//                 <a href={mockDetail.profileUrl} target="_blank" rel="noopener noreferrer" className="meta-link">
//                   site &gt;
//                 </a>
//               </div>
//               <div className="meta-row">
//                 <span className="meta-label">Project</span>
//                 <span className="meta-link" onClick={() => navigate(`/projects/${mockDetail.projectId}`)}>
//                   {mockDetail.projectName} &gt;
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }