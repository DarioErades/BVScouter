const fs = require('fs');

async function buildCode() {
  const code = `
  let query = 'SELECT video_timestamp, marcador_local, marcador_rival FROM acciones WHERE partido_id = ? AND video_timestamp > 0';
  const params = [partidoId];

  if (filters.jugador_id) {
    query += ' AND jugador_id = ?';
    params.push(filters.jugador_id);
  }
  if (filters.complejo) {
    query += ' AND complejo = ?';
    params.push(filters.complejo);
  }
  if (filters.tipo_accion) {
    query += ' AND tipo_accion = ?';
    params.push(filters.tipo_accion);
  }
  if (filters.resultado) {
    query += ' AND resultado = ?';
    params.push(filters.resultado);
  }
  
  query += ' ORDER BY video_timestamp ASC';

  const acciones = db.prepare(query).all(...params);
  
  if (acciones.length === 0) {
    throw new Error('No se encontraron acciones con esos filtros que tengan un tiempo de vídeo registrado.');
  }

  const preMargin = filters.pre_margin !== undefined ? parseFloat(filters.pre_margin) : 3;
  const postMargin = filters.post_margin !== undefined ? parseFloat(filters.post_margin) : 1;

  let intervals = acciones.map(a => ({
      start: Math.max(0, a.video_timestamp - preMargin),
      end: a.video_timestamp + postMargin,
      score: \`\${a.marcador_local || 0} - \${a.marcador_rival || 0}\`
  }));
  
  if (intervals.length > 0) {
      intervals.sort((a, b) => a.start - b.start);
      const merged = [intervals[0]];
      for (let i = 1; i < intervals.length; i++) {
          const last = merged[merged.length - 1];
          const curr = intervals[i];
          if (curr.start <= last.end) {
              last.end = Math.max(last.end, curr.end);
          } else {
              merged.push(curr);
          }
      }
      intervals = merged;
  }
  
  // comprobamos si tiene audio para que el filtro no pete
  let hasAudio = false;
  try {
      const { stdout } = await execAsync(\`ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "\${videoPath.replace(/"/g, '\\\\"')}"\`);
      hasAudio = stdout.trim().length > 0;
  } catch(e) {}

  const filterFilePath = path.join(os.tmpdir(), \`bvscouter_filter_\${Date.now()}.txt\`);
  let filterGraph = '';
  let concatInputs = '';

  intervals.forEach((interval, i) => {
      // marcador bonito arriba a la derecha
      const text = \` \${interval.score} \`;
      filterGraph += \`[0:v]trim=start=\${interval.start.toFixed(2)}:end=\${interval.end.toFixed(2)},setpts=PTS-STARTPTS,drawtext=text='\${text}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.6:boxborderw=15:x=w-tw-30:y=30[v\${i}];\\n\`;
      
      if (hasAudio) {
          filterGraph += \`[0:a]atrim=start=\${interval.start.toFixed(2)}:end=\${interval.end.toFixed(2)},asetpts=PTS-STARTPTS[a\${i}];\\n\`;
          concatInputs += \`[v\${i}][a\${i}]\`;
      } else {
          concatInputs += \`[v\${i}]\`;
      }
  });
  
  filterGraph += \`\${concatInputs}concat=n=\${intervals.length}:v=1:a=\${hasAudio ? 1 : 0}[outv]\${hasAudio ? '[outa]' : ''}\`;
  
  fs.writeFileSync(filterFilePath, filterGraph);
  
  try {
      const escapedFilter = filterFilePath.replace(/"/g, '\\\\"');
      const escapedVideo = videoPath.replace(/"/g, '\\\\"');
      const escapedOutput = filePath.replace(/"/g, '\\\\"');
      
      // re-encode the segments, fixes glitching perfectly
      const audioMap = hasAudio ? ' -map "[outa]" ' : ' ';
      const cmd = \`ffmpeg -y -i "\${escapedVideo}" -filter_complex_script "\${escapedFilter}" -map "[outv]"\${audioMap}"\${escapedOutput}"\`;
      
      await execAsync(cmd);
      shell.openPath(filePath);
      return filePath;
  } catch (err) {
      console.error('Error con FFmpeg:', err);
      throw new Error('Fallo al generar el vídeo. FFmpeg no pudo procesarlo.');
  } finally {
      if (fs.existsSync(filterFilePath)) {
          fs.unlinkSync(filterFilePath);
      }
  }`;
  
  console.log(code);
}
buildCode();
