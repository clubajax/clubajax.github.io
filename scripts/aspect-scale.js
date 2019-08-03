
const wrap = dom.query('.wrapper');
const avatar = dom.query('.avatar');
const A_SIZE = 60;
const PCT = .33;

function scale(amount) {
    dom.style(avatar, 'transform', `scale(${amount})`);
}
function getSize() {
    const w = wrap.offsetWidth;
    const h = wrap.offsetHeight;
    const dim = w < h ? w : h;
    const size = PCT * dim;
    const trans = size / A_SIZE;
    return trans;
}

scale(getSize());
function transform() {
    scale(getSize());
}

on(window, 'resize', transform);
