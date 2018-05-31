import _ from 'lodash';
import Vue from 'vue/dist/vue.esm.js';
import pong from '../pong';

window.ws = undefined;

function precise(x, precision) {
  return Number.parseFloat(x).toPrecision(precision);
}

new Vue({
  el: '#pong',
  data: {
    playerIds: [],
    scores: [0, 0],
    positions: {},
    isPlaying: false
  },
  methods: {
    incrementScore(player) {
      this.$set(this.scores, player, this.scores[player] + 1);
    },
    togglePlaying() {
      this.isPlaying = !this.isPlaying;
      pong.setPlaying(this.isPlaying);
    },
    addPlayer(id) {
      const ids = pong.addPlayer(id);
      this.playerIds = ids;
    },
    removePlayer(id) {
      // TODO
    },
    updatePosition(positions) {
      if (!this.arePlayersConnected) {
        return;
      }
      this.positions = positions;
      Object.keys(positions).forEach(playerId => {
        pong.updatePosition(playerId, positions[playerId]);
      });
    }
  },
  computed: {
    arePlayersConnected() {
      return this.connectedPlayer1 && this.connectedPlayer2;
    },
    connectedPlayer1() {
      return this.playerIds[0] != undefined;
    },
    connectedPlayer2() {
      return this.playerIds[1] != undefined;
    }
  },
  beforeDestroy() {
    window.ws.close();
  },
  mounted() {
    window.addEventListener('keydown', event => {
      if (event.keyCode === 32) {
        if (!this.arePlayersConnected) {
          return;
        }
        this.togglePlaying();
      }
    });

    pong.init(this.$refs.pongContainer, this.incrementScore);

    window.ws = new WebSocket('ws://localhost:8080');
    window.ws.onmessage = message => {
      const parsed = JSON.parse(message.data);

      switch (parsed.event) {
        case 'playerIn':
          this.addPlayer(parsed.id);
          break;

        case 'playerOut':
          this.removePlayer(parsed.id);
          break;

        case 'position':
          this.updatePosition(parsed.positions);
          break;

        default:
          console.warn(`skipping unknown message from server ${parsed.event}`);
          break;
      }
    };

    window.ws.onopen = () => {
      window.ws.send('getPlayers');
    };
  }
});
