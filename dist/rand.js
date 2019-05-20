// Club AJAX General Purpose Code
//
// Randomizer
//
// author:
//              Mike Wilcox
// site:
//              http://clubajax.org
// support:
//              http://groups.google.com/group/clubajax
//
// clubajax.lang.rand
//
//      DESCRIPTION:
//              A randomizer library that's great for producing mock data.
//              Allows dozens of ways to randomize numbers, strings, words,
//              sentences, and dates. Includes tiny libraries of the most
//              commonly used words (in order), the most commonly used letters
//              (in order) and personal names that can be used as first or last.
//              For making sentences, "wurds" are used - words with scrambled vowels
//              so they aren't actual words, but look more like lorem ipsum. Change the
//              property real to true to use "words" instead of "wurds" (it can
//              also produce humorous results).

//      USAGE:
//              include file:
//                      <script src="clubajax/lang/rand.js"></script>
//
// TESTS:
//              See tests/rand.html
//
/* UMD.define */ (function (root, factory) {
    if (typeof define === 'function' && define.amd) { define([], factory); } else if (typeof exports === 'object') { module.exports = factory(); } else { root.returnExports = factory(); window.rand = factory(); }
}(this, function () {

    var
        rand,
        cityStates = [ "New York, New York", "Los Angeles, California", "Chicago, Illinois", "Houston, Texas", "Philadelphia, Pennsylvania", "Phoenix, Arizona", "San Diego, California", "San Antonio, Texas", "Dallas, Texas", "Detroit, Michigan", "San Jose, California", "Indianapolis, Indiana", "Jacksonville, Florida", "San Francisco, California", "Columbus, Ohio", "Austin, Texas", "Memphis, Tennessee", "Baltimore, Maryland", "Charlotte, North Carolina", "Fort Worth, Texas", "Boston, Massachusetts", "Milwaukee, Wisconsin", "El Paso, Texas", "Washington, District of Columbia", "Nashville-Davidson, Tennessee", "Seattle, Washington", "Denver, Colorado", "Las Vegas, Nevada", "Portland, Oregon", "Oklahoma City, Oklahoma", "Tucson, Arizona", "Albuquerque, New Mexico", "Atlanta, Georgia", "Long Beach, California", "Kansas City, Missouri", "Fresno, California", "New Orleans, Louisiana", "Cleveland, Ohio", "Sacramento, California", "Mesa, Arizona", "Virginia Beach, Virginia", "Omaha, Nebraska", "Colorado Springs, Colorado", "Oakland, California", "Miami, Florida", "Tulsa, Oklahoma", "Minneapolis, Minnesota", "Honolulu, Hawaii", "Arlington, Texas", "Wichita, Kansas", "St. Louis, Missouri", "Raleigh, North Carolina", "Santa Ana, California", "Cincinnati, Ohio", "Anaheim, California", "Tampa, Florida", "Toledo, Ohio", "Pittsburgh, Pennsylvania", "Aurora, Colorado", "Bakersfield, California", "Riverside, California", "Stockton, California", "Corpus Christi, Texas", "Lexington-Fayette, Kentucky", "Buffalo, New York", "St. Paul, Minnesota", "Anchorage, Alaska", "Newark, New Jersey", "Plano, Texas", "Fort Wayne, Indiana", "St. Petersburg, Florida", "Glendale, Arizona", "Lincoln, Nebraska", "Norfolk, Virginia", "Jersey City, New Jersey", "Greensboro, North Carolina", "Chandler, Arizona", "Birmingham, Alabama", "Henderson, Nevada", "Scottsdale, Arizona", "North Hempstead, New York", "Madison, Wisconsin", "Hialeah, Florida", "Baton Rouge, Louisiana", "Chesapeake, Virginia", "Orlando, Florida", "Lubbock, Texas", "Garland, Texas", "Akron, Ohio", "Rochester, New York", "Chula Vista, California", "Reno, Nevada", "Laredo, Texas", "Durham, North Carolina", "Modesto, California", "Huntington, New York", "Montgomery, Alabama", "Boise, Idaho", "Arlington, Virginia", "San Bernardino, California" ],
        streetSuffixes = 'Road,Drive,Avenue,Blvd,Lane,Street,Way,Circle'.split(','),
        streets = "First,Fourth,Park,Fifth,Main,Sixth,Oak,Seventh,Pine,Maple,Cedar,Eighth,Elm,View,Washington,Ninth,Lake,Hill,High,Station,Main,Park,Church,Church,London,Victoria,Green,Manor,Church,Park,The Crescent,Queens,New,Grange,Kings,Kingsway,Windsor,Highfield,Mill,Alexander,York,St. John\'s,Main,Broadway,King,The Green,Springfield,George,Park,Victoria,Albert,Queensway,New,Queen,West,North,Manchester,The Grove,Richmond,Grove,South,School,North,Stanley,Chester,Mill,".split(','),
        states = [ "Alabama", "Alaska", "American Samoa", "Arizona", "Arkansas", "Armed Forces Europe", "Armed Forces Pacific", "Armed Forces the Americas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Federated States of Micronesia", "Florida", "Georgia", "Guam", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Marshall Islands", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Northern Mariana Islands", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Puerto Rico", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virgin Islands, U.S.", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming" ],
        stateAbbr = [ "AL", "AK", "AS", "AZ", "AR", "AE", "AP", "AA", "CA", "CO", "CT", "DE", "DC", "FM", "FL", "GA", "GU", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MH", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "MP", "OH", "OK", "OR", "PA", "PR", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VI", "VA", "WA", "WV", "WI", "WY" ],
        names = "Abraham,Albert,Alexis,Allen,Allison,Alexander,Amos,Anton,Arnold,Arthur,Ashley,Barry,Belinda,Belle,Benjamin,Benny,Bernard,Bradley,Brett,Ty,Brittany,Bruce,Bryant,Carrey,Carmen,Carroll,Charles,Christopher,Christie,Clark,Clay,Cliff,Conrad,Craig,Crystal,Curtis,Damon,Dana,David,Dean,Dee,Dennis,Denny,Dick,Douglas,Duncan,Dwight,Dylan,Eddy,Elliot,Everett,Faye,Francis,Frank,Franklin,Garth,Gayle,George,Gilbert,Glenn,Gordon,Grace,Graham,Grant,Gregory,Gottfried,Guy,Harrison,Harry,Harvey,Henry,Herbert,Hillary,Holly,Hope,Howard,Hugo,Humphrey,Irving,Isaak,Janis,Jay,Joel,John,Jordan,Joyce,Juan,Judd,Julia,Kaye,Kelly,Keith,Laurie,Lawrence,Lee,Leigh,Leonard,Leslie,Lester,Lewis,Lilly,Lloyd,George,Louis,Louise,Lucas,Luther,Lynn,Mack,Marie,Marshall,Martin,Marvin,May,Michael,Michelle,Milton,Miranda,Mitchell,Morgan,Morris,Murray,Newton,Norman,Owen,Patrick,Patti,Paul,Penny,Perry,Preston,Quinn,Ray,Rich,Richard,Roland,Rose,Ross,Roy,Ruby,Russell,Ruth,Ryan,Scott,Seymour,Shannon,Shawn,Shelley,Sherman,Simon,Stanley,Stewart,Susann,Sydney,Taylor,Thomas,Todd,Tom,Tracy,Travis,Tyler,Tyler,Vincent,Wallace,Walter,Penn,Wayne,Will,Willard,Willis",
        words = "the,of,and,a,to,in,is,you,that,it,he,for,was,on,are,as,with,his,they,at,be,this,from,I,have,or,by,one,had,not,but,what,all,were,when,we,there,can,an,your,which,their,said,if,do,will,each,about,how,up,out,them,then,she,many,some,so,these,would,other,into,has,more,her,two,like,him,see,time,could,no,make,than,first,been,its,who,now,people,my,made,over,did,down,only,way,find,use,may,water,long,little,very,after,words,called,just,where,most,know,get,through,back,much,before,go,good,new,write,out,used,me,man,too,any,day,same,right,look,think,also,around,another,came,come,work,three,word,must,because,does,part,even,place,well,such,here,take,why,things,help,put,years,different,away,again,off,went,old,number,great,tell,men,say,small,every,found,still,between,name,should,home,big,give,air,line,set,own,under,read,last,never,us,left,end,along,while,might,next,sound,below,saw,something,thought,both,few,those,always,looked,show,large,often,together,asked,house,don't,world,going,want,school,important,until,form,food,keep,children,feet,land,side,without,boy,once,animals,life,enough,took,sometimes,four,head,above,kind,began,almost,live,page,got,earth,need,far,hand,high,year,mother,light,parts,country,father,let,night,following,picture,being,study,second,eyes,soon,times,story,boys,since,white,days,ever,paper,hard,near,sentence,better,best,across,during,today,others,however,sure,means,knew,its,try,told,young,miles,sun,ways,thing,whole,hear,example,heard,several,change,answer,room,sea,against,top,turned,learn,point,city,play,toward,five,using,himself,usually",
        letters = ("etaonisrhldcmufpgwybvkjxqz").split(""),
        sites = "Google,Facebook,YouTube,Yahoo,Live,Bing,Wikipedia,Blogger,MSN,Twitter,Wordpress,MySpace,Microsoft,Amazon,eBay,LinkedIn,flickr,Craigslist,Rapidshare,Conduit,IMDB,BBC,Go,AOL,Doubleclick,Apple,Blogspot,Orkut,Photobucket,Ask,CNN,Adobe,About,mediafire,CNET,ESPN,ImageShack,LiveJournal,Megaupload,Megavideo,Hotfile,PayPal,NYTimes,Globo,Alibaba,GoDaddy,DeviantArt,Rediff,DailyMotion,Digg,Weather,ning,PartyPoker,eHow,Download,Answers,TwitPic,Netflix,Tinypic,Sourceforge,Hulu,Comcast,Archive,Dell,Stumbleupon,HP,FoxNews,Metacafe,Vimeo,Skype,Chase,Reuters,WSJ,Yelp,Reddit,Geocities,USPS,UPS,Upload,TechCrunch,Pogo,Pandora,LATimes,USAToday,IBM,AltaVista,Match,Monster,JotSpot,BetterVideo,ClubAJAX,Nexplore,Kayak,Slashdot";

    rand = {
        real: false,
        words: words.split(","),
        wurds: [],
        names: names.split(","),
        letters: letters,
        sites: sites.split(","),

        toArray: function (thing) {
            var
                nm, i,
                a = [];

            if (typeof (thing) === "object" && !(!!thing.push || !!thing.item)) {
                for (nm in thing) { if (thing.hasOwnProperty(nm)) { a.push(thing[ nm ]); } }
                thing = a;
            }
            else if (typeof (thing) === "string") {
                if (/\./.test(thing)) {
                    thing = thing.split(".");
                    thing.pop();
                    i = thing.length;
                    while (i--) {
                        thing[ i ] = this.trim(thing[ i ]) + ".";
                    }
                } else if (/,/.test(thing)) {
                    thing = thing.split(",");
                } else if (/\s/.test(thing)) {
                    thing = thing.split(" ");
                } else {
                    thing = thing.split("");
                }
            }
            return thing; //Array
        },

        trim: function (s) { // thanks to Dojo:
            return String.prototype.trim ? s.trim() :
                s.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        },

        pad: function (n, amt, chr) {
            var c = chr || "0"; amt = amt || 2;
            return (c + c + c + c + c + c + c + c + c + c + n).slice(-amt);
        },

        cap: function (w) {
            return w.charAt(0).toUpperCase() + w.substring(1);
        },

        weight: function (n, exp) {
            var
                res,
                rev = exp < 0;
            exp = exp === undefined ? 1 : Math.abs(exp) + 1;
            res = Math.pow(n, exp);
            return rev ? 1 - res : res;
        },

        n: function (n, w) {
            return Math.floor((n || 10) * this.weight(Math.random(), w));
        },

        range: function (min, max, w) {
            max = max || 0;
            return this.n(Math.abs(max - min) + 1, w) + (min < max ? min : max);
        },

        element: function (thing, w) {
            // return rand slot, char, prop or range
            if (typeof (thing) === "number") { return this.n(thing, w); }
            thing = this.toArray(thing);
            return thing[ this.n(thing.length, w) ];
        },

        scramble: function (ary) {
            var
                a = ary.concat([]),
                sd = [],
                i = a.length;
            while (i--) {
                sd.push(a.splice(this.n(a.length), 1)[ 0 ]);
            }
            return sd;
        },

        bignumber: function (len) {
            var t = "";
            while (len--) {
                t += this.n(9);
            }
            return t;
        },

        date: function (o) {
            o = o || {};
            var
                d,
                d1 = new Date(o.min || new Date()),
                d2 = new Date(o.max || new Date().setFullYear(d1.getFullYear() + (o.yearRange || 1))).getTime();
            d1 = d1.getTime();
            d = new Date(this.range(d1, d2, o.weight));
            if (o.seconds) {
                return d.getTime();
            } else if (o.delimiter) {
                return this.pad(d.getMonth() + 1) + o.delimiter + this.pad(d.getDate() + 1) + o.delimiter + (d.getFullYear());
            }
            return d;
        },

        bool: function (w) {
            return this.n(2, w) < 1;
        },

        color: function (w) {
            return "#" + this.pad(this.n(255, w).toString(16)) + this.pad(this.n(255, w).toString(16)) + this.pad(this.n(255, w).toString(16));
        },

        chars: function (min, max, w) {
            var s = "",
                i = this.range(min, max, w);
            while (i--) {
                s += this.letters[ this.n(this.letters.length) ];
            }
            return s;
        },

        name: function (cse) {
            // cse: 0 title case, 1 lowercase, 2 upper case
            var s = this.names[ this.n(this.names.length) ];
            return !cse ? s : cse === 1 ? s.toLowerCase() : s.toUpperCase();
        },

        cityState: function () {
            return cityStates[ this.n(cityStates.length) ];
        },

        state: function (cse) {
            // cse: 0 title case, 1 lowercase, 2 upper case
            var s = states[ this.n(states.length) ];
            return !cse ? s : cse === 1 ? s.toLowerCase() : s.toUpperCase();
        },

        stateCode: function (cse) {
            cse = cse === undefined ? 2 : cse;
            // cse: 0 title case, 1 lowercase, 2 upper case
            var s = stateAbbr[ this.n(stateAbbr.length) ];
            return !cse ? s : cse === 1 ? s.toLowerCase() : s.toUpperCase();
        },

        street: function (noSuffix) {
            var s = streets[ this.n(streets.length) ];
            if (!noSuffix) {
                s += ' ' + streetSuffixes[ this.n(streetSuffixes.length) ];
            }
            return s;
        },

        site: function (cse) {
            // cse: 0 title case, 1 lowercase, 2 upper case
            var s = this.sites[ this.n(this.sites.length) ];
            return !cse ? s : cse === 1 ? s.toLowerCase() : s.toUpperCase();
        },

        url: function (usewww, xt) {
            var w = usewww ? "www." : "";
            xt = xt || ".com";
            return "http://" + w + this.site(1) + xt;
        },

        word: function () {
            var w = this.real ? this.words : this.wurds;
            return w[ this.n(w.length) ];
        },

        sentences: function (minAmt, maxAmt, minLen, maxLen) {
            // amt: sentences, len: words
            minAmt = minAmt || 1;
            maxAmt = maxAmt || minAmt;
            minLen = minLen || 5;
            maxLen = maxLen || minLen;

            var
                ii,
                s = [],
                t = "",
                w = this.real ? this.words : this.wurds,
                i = this.range(minAmt, maxAmt);

            while (i--) {

                ii = this.range(minLen, maxLen); while (ii--) {
                    s.push(w[ this.n(w.length) ]);
                }
                t += this.cap(s.join(" ")) + ". ";
            }
            return t;
        },

        title: function (min, max) {
            min = min || 1; max = max || min;
            var
                a = [],
                w = this.real ? this.words : this.wurds,
                i = this.range(min, max);
            while (i--) {
                a.push(this.cap(w[ this.n(w.length) ]));
            }
            return a.join(" ");
        },
        data: function (amt) {
            var
                st,
                items = [],
                item,
                i;
            for (i = 0; i < amt; i++) {
                item = {
                    firstName: this.name(),
                    lastName: this.name(),
                    company: this.site(),
                    address1: this.bignumber(this.range(3, 5)),
                    address2: this.street(),
                    birthday: this.date({ delimiter: '/' })
                };
                item.email = (item.firstName.substring(0, 1) + item.lastName + '@' + item.company + '.com').toLowerCase();
                st = this.cityState();
                item.city = st.split(', ')[ 0 ];
                item.state = st.split(', ')[ 1 ];
                item.zipcode = this.bignumber(5);
                item.phone = this.format(this.bignumber(10), 'phone');
                item.ssn = this.format(this.bignumber(9), 'ssn');
                items.push(item);
            }
            return items;
        },

        format: function (n, type) {
            var d = '-';
            switch (type) {
                case 'phone':
                    n = '' + n;
                    return n.substring(0, 3) + d + n.substring(3, 6) + d + n.substring(6);
                case 'ssn':
                    n = '' + n;
                    return n.substring(0, 3) + d + n.substring(3, 5) + d + n.substring(5);
            }
        }
    };
    rand.wurds = words.replace(/a|e|i|o|u/g, function (c) { return ("aeiou")[ rand.n(5) ]; }).split(",");

    return rand;
}));