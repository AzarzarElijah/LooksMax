import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { AgeScreen } from "../screens/onboarding/AgeScreen";
import { GoalsScreen } from "../screens/onboarding/GoalsScreen";
import { StyleScreen } from "../screens/onboarding/StyleScreen";
import { UploadScreen } from "../screens/UploadScreen";
import { AnalyzingScreen } from "../screens/AnalyzingScreen";
import { ResultsScreen } from "../screens/ResultsScreen";
import { CategoryDetailScreen } from "../screens/CategoryDetailScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { PlanScreen } from "../screens/PlanScreen";
import { ProgressScreen } from "../screens/ProgressScreen";
import { PremiumScreen } from "../screens/PremiumScreen";
import { TabLayout } from "../navigation/TabLayout";
import { RootErrorBoundary } from "./RootErrorBoundary";
import { ROUTES } from "../navigation/routes";

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RootErrorBoundary />,
    children: [
      { path: ROUTES.welcome, element: <WelcomeScreen /> },
      { path: ROUTES.onboardingAge, element: <AgeScreen /> },
      { path: ROUTES.onboardingGoals, element: <GoalsScreen /> },
      { path: ROUTES.onboardingStyle, element: <StyleScreen /> },
      { path: ROUTES.upload, element: <UploadScreen /> },
      { path: ROUTES.analyzing, element: <AnalyzingScreen /> },
      { path: ROUTES.results, element: <ResultsScreen /> },
      { path: "/scan/results/:category", element: <CategoryDetailScreen /> },
      { path: ROUTES.premium, element: <PremiumScreen /> },
      {
        path: "/app",
        element: <TabLayout />,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", element: <HomeScreen /> },
          { path: "plan", element: <PlanScreen /> },
          { path: "progress", element: <ProgressScreen /> },
        ],
      },
      { path: "*", element: <Navigate to={ROUTES.welcome} replace /> },
    ],
  },
]);
