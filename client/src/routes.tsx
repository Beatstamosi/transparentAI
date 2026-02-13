import Home from "./components/Home/Home";
import MyAgent from "./components/MyAgent/MyAgent";
import ContextManager from "./components/ContextManager/ContextManager";
import MainLayout from "./components/MainLayout";

const routes = [
  {
    path: "/",
    element: <Home />,
  },
  {
    element: <MainLayout />,
    children: [
      {
        path: "my-agent",
        element: <MyAgent />,
      },
      {
        path: "my-context",
        element: <ContextManager />,
      },
    ],
  },
];

export default routes;
