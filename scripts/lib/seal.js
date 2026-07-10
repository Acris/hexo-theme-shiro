'use strict';

const SEAL_PATH_D = 'M15,12 Q50,5 85,12 Q95,50 88,88 Q50,95 12,88 Q5,50 15,12 Z';
const SEAL_FILTER_DEFS = '<defs>'
    + '<filter id="seal-roughness" x="-20%" y="-20%" width="140%" height="140%">'
    + '<feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" result="noise"/>'
    + '<feDisplacementMap in="SourceGraphic" in2="noise" scale="3"/></filter>'
    + '<filter id="text-erosion">'
    + '<feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="1" result="noise"/>'
    + '<feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5"/></filter>'
    + '</defs>';

module.exports = {
    SEAL_PATH_D,
    SEAL_FILTER_DEFS
};
