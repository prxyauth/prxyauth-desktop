/**
 * Shared date formatting — the three intentional formats used across
 * the renderer. One home, no per-file copies.
 */

/** "Jan 5, 03:24 PM" — compact card timestamps. */
export function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/** "Mon, Jan 5, 2026, 03:24 PM" — detail pages. */
export function formatFullDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatRelativeExpiry(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.abs(Math.round(diffMs / (1000 * 60 * 60)));
    const diffDays = Math.abs(Math.round(diffMs / (1000 * 60 * 60 * 24)));

    if (diffMs > 0) {
        if (diffHours < 24) return `Expires in ${diffHours}h`;
        return `Expires in ${diffDays}d`;
    } else {
        if (diffHours < 24) return `Expired ${diffHours}h ago`;
        return `Expired ${diffDays}d ago`;
    }
}

/** "Jan 5, 2026" — date-only (subscriptions). */
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
