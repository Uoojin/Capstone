import { useNavigate } from 'react-router-dom';
import './ProjectCard.css';

function ProjectCard({ project }) {
    const navigate = useNavigate();

    return (

        <div className="project-card" onClick={() => navigate(`/projects/${project.teamId}`)}>
            <img src={project.thumbImg} alt={project.title} loading="lazy" />
        </div>


    );
}

export default ProjectCard;