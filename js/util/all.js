export default async function all(promises) {
    try {
        return await Promise.all(promises);
    }
    catch(e) {
        await Promise.allSettled(promises);
        throw e;
    }
}
