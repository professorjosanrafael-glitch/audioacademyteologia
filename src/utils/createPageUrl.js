export function createPageUrl(pageName) {
  const routes = {
    Home: "/",
    Pricing: "/pricing",
    AudiobookDetails: "/audiobook",
    Player: "/player",
    Login: "/login",
    Profile: "/profile",
  };

  return routes[pageName] || "/";
}
