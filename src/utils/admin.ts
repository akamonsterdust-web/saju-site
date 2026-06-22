const ADMIN_KEY = "renarei"
const SESSION_KEY = "saju_admin_session"

export function initAdminMode(): void {
  const params = new URLSearchParams(window.location.search)
  const key = params.get("admin")
  if (key === ADMIN_KEY) {
    sessionStorage.setItem(SESSION_KEY, "true")
    const url = new URL(window.location.href)
    url.searchParams.delete("admin")
    window.history.replaceState({}, "", url.toString())
    console.log("🔑 관리자 모드 활성화")
  }
}

export function isAdmin(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "true"
}

export function logoutAdmin(): void {
  sessionStorage.removeItem(SESSION_KEY)
}
