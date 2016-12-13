window.addEventListener('load', function() {
  const params = document.body.attributes;
  const API_KEY = params['data-key'].value;
  const CHANNEL = params['data-id'].value;
  console.info('Setting up using key "%s" and id "%s"', API_KEY, CHANNEL);

  const controller = document.getElementById('controller');
  const conns = new Set();
  const keys = [];
  const areas = [];
  const states = Object.create(null);

  function circlesIntersect(r1, r2, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const radii = r1 + r2;
    return (dx * dx + dy * dy < radii * radii);
  }

  function mapKeys() {
    areas.splice(0, areas.length);

    const touchables = svg.querySelectorAll('[id]');
    [...touchables].forEach(touchable => {
      const rect = touchable.getBoundingClientRect();
      const area = {
        id: touchable.id,
        pos: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
        radius: rect.width * .9,
      };
      areas.push(area);
      keys.push(area.id);
      states[area.id] = false;
    });
  }

  function sendEvent(key, state) {
    if (states[key] === state) {
      return;
    }

    if (state) {
      navigator.vibrate(50);
    }

    states[key] = state;
    const payload = {
      key,
      state: state ? 'keydown' : 'keyup',
    };

    console.info('State changed %s / %s', key, payload.state);

    if (conns.size) {
      conns.forEach(conn => conn.send(payload));
      console.info('Sent', payload);
    }
  }

  function handleTouch(event) {
    event.preventDefault();

    const filter = Object.create(null);
    if (event.touches.length) {
      [...event.touches].forEach(touch => {
        areas.forEach(area => {
          const intersects = circlesIntersect(area.radius, 12,
            area.pos.x, area.pos.y, touch.clientX, touch.clientY);
          filter[area.id] = filter[area.id] || intersects;
        });
      });
    }
    keys.forEach(key => sendEvent(key, filter[key] || false));
  }

  const svg = controller.contentDocument;
  svg.addEventListener('touchstart', handleTouch);
  svg.addEventListener('touchend', handleTouch);
  svg.addEventListener('touchmove', handleTouch);

  mapKeys();
  window.addEventListener('resize', mapKeys)

  const peer = new Peer({key: API_KEY});
  const conn = peer.connect(CHANNEL);
  conn.on('open', function() {
    conns.add(conn);
    console.info('Connection established on channel "%s"', CHANNEL);

    conn.on('data', function(data) {
      console.info('Received', data);
    });
  });
});