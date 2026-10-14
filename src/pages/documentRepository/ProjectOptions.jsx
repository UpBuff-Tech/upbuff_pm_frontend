/** The <option>s of a project dropdown: the client's projects. */
export default function ProjectOptions({ projects }) {
  return projects.map((project) => (
    <option value={project._id} key={project._id}>{project.name}</option>
  ));
}
