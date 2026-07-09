const intervals = [
  { start: 10, end: 15, score: '1 - 0' },
  { start: 25, end: 30, score: '2 - 0' }
];

let filterGraph = '';
let concatInputs = '';

intervals.forEach((interval, i) => {
    filterGraph += `[0:v]trim=start=${interval.start}:end=${interval.end},setpts=PTS-STARTPTS,drawtext=text='${interval.score}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=10:x=w-tw-20:y=20[v${i}];`;
    filterGraph += `[0:a]atrim=start=${interval.start}:end=${interval.end},asetpts=PTS-STARTPTS[a${i}];`;
    concatInputs += `[v${i}][a${i}]`;
});

filterGraph += `${concatInputs}concat=n=${intervals.length}:v=1:a=1[outv][outa]`;

console.log(filterGraph);
