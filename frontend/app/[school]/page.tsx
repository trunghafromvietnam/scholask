import Chat from "@/components/Chat";

export default function SchoolHome({ params }: { params: { school: string } }) {
  const { school } = params;
  return <Chat school={school} />;
}




