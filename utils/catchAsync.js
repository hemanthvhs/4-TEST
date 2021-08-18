module.exports = (fn) => (req, res, next) => fn(req, res, next).catch(next);

/*  SAME AS ABOVE - FOR BETTER UNDERSTANDING

module.exports = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(err => next(err));
    }
}
*/
