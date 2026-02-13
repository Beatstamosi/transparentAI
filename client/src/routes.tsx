import Home from "./components/Home/Home";
import MyAgent from "./components/MyAgent/MyAgent";
import ContextManager from "./components/ContextManager/ContextManager";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Auth from "./components/Auth/Auth";

const routes = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/my-context", element: <ContextManager /> },
          { path: "/my-agent", element: <MyAgent /> },
        ],
      },
    ],
  },
];

export default routes;
