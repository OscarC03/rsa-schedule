interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "Caricamento in corso..." }: LoadingScreenProps) => {
  return (
    <div
      className="p-4 flex items-center justify-center min-h-[100vh] bg-gradient-to-br from-indigo-100 via-white to-blue-100"
      style={{
        fontSize: "1.3rem",
        fontWeight: 600,
        color: "#6366f1",
        borderRadius: 0,
        boxShadow: "none",
        minHeight: "100vh",
        height: "100vh",
        width: "100vw",
      }}
    >
      {message}
    </div>
  );
};
