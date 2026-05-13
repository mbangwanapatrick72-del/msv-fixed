import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#f8fafb] to-[#e8f8f5] p-6">
      <div className="text-center mb-12">
        <h1
          className="text-5xl font-extrabold mb-3"
          style={{ fontFamily: "Sora, sans-serif", color: "#0d1f3c" }}
        >
          MS<span style={{ color: "#1abc9c" }}>V</span>
        </h1>
        <p className="text-lg text-[#4a5568] max-w-md">
          Plateforme médicale numérique — choisissez votre espace
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        {/* Patient Portal */}
        <Link href="/patient/home" className="group">
          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent transition-all duration-200 group-hover:border-[#1abc9c] group-hover:-translate-y-1 group-hover:shadow-xl text-center">
            <div className="text-5xl mb-4">🧑‍⚕️</div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "Sora, sans-serif", color: "#0d1f3c" }}
            >
              Espace Patient
            </h2>
            <p className="text-sm text-[#4a5568] mb-6">
              Accédez à vos dossiers médicaux, prenez des rendez-vous et
              consultez vos résultats.
            </p>
            <span className="inline-block px-6 py-2.5 bg-[#1abc9c] text-white rounded-lg font-semibold text-sm transition-colors group-hover:bg-[#159f84]">
              Accéder →
            </span>
          </div>
        </Link>

        {/* Doctor Portal */}
        <Link href="/doctor/login" className="group">
          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-transparent transition-all duration-200 group-hover:border-[#1a4db5] group-hover:-translate-y-1 group-hover:shadow-xl text-center">
            <div className="text-5xl mb-4">🩺</div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "Sora, sans-serif", color: "#0d1f3c" }}
            >
              Espace Médecin
            </h2>
            <p className="text-sm text-[#4a5568] mb-6">
              Gérez vos patients, planifiez vos consultations et accédez aux
              dossiers médicaux.
            </p>
            <span className="inline-block px-6 py-2.5 bg-[#1a4db5] text-white rounded-lg font-semibold text-sm transition-colors group-hover:bg-[#13399a]">
              Accéder →
            </span>
          </div>
        </Link>
      </div>

      <footer className="mt-16 text-center text-sm text-[#8a97a8]">
        © {new Date().getFullYear()} MSV Healthcare. Tous droits réservés.
      </footer>
    </div>
  );
}
