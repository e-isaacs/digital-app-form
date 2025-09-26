export default function Header() {
  return (
    <header className="bg-brand shadow-md py-8">
      <div className="flex justify-center items-center w-full">
        <img
          src="/logo.png"
          alt="Inhale Capital Logo"
          className="block mx-auto h-12 md:h-16"
          style={{ maxWidth: "180px" }}
        />
      </div>
    </header>
  );
}
