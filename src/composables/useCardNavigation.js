export function useCardNavigation(pages) {
    const byId = new Map(pages.map((page) => [page.id, page]))
    const byPath = new Map(pages.map((page) => [page.route, page]))

    function getCardById(cardId) {
        return byId.get(cardId) ?? null
    }

    function getCardByPath(path) {
        return byPath.get(path) ?? null
    }

    function getPathByCardId(cardId) {
        return getCardById(cardId)?.route ?? '/'
    }

    return {
        getCardById,
        getCardByPath,
        getPathByCardId
    }
}
