export type School = {
    name: string;
    slug: string;
    logo: string; 
    location: string;
  };
  
  // Dữ liệu demo
  export const SCHOOLS: School[] = [
    {
      name: "Seattle Central College",
      slug: "seattle-central-college",
      logo: "/logos/seattle-central-logo.png", 
      location: "Seattle, WA",
    },
  ];