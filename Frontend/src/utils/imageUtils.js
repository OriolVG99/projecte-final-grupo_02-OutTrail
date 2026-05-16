export const getImageUrl = (path) => {
  if (!path) return "/OutTrail-sinfondo.png";
  if (path.startsWith("http")) return path;
  return `/uploads/${path}`;
};
