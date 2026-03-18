# Insights

Three things I learned about the game using the tool.

---

## 1. Storm kills 3x more players on Lockdown and GrandRift than AmbroseValley

### What caught my eye
While switching between maps on the storm deaths heatmap, Lockdown and GrandRift showed noticeably more storm death markers spread across the map compared to AmbroseValley, where storm deaths were rare.

### The data

| Map | Storm deaths | Total deaths | Storm death rate |
|-----|-------------|-------------|-----------------|
| AmbroseValley | 17 | 505 | 3.4% |
| Lockdown | 17 | 185 | 9.2% |
| GrandRift | 5 | 52 | 9.6% |

Despite having far fewer total deaths, Lockdown and GrandRift have nearly 3x the storm death rate compared to AmbroseValley. On the smaller maps, roughly 1 in 10 deaths is caused by the storm rather than combat.

### Actionable items
- **Metrics affected**: Storm death rate, player extraction success rate, match completion satisfaction
- **Actions**: Review storm pacing on Lockdown and GrandRift. The smaller map size combined with the storm speed may not give players enough time to reach extraction points. Consider slowing the storm on these maps, adding more extraction points, or adjusting storm boundaries to leave more safe area for longer.

### Why a level designer should care
Storm deaths are unintentional deaths from the player's perspective, they feel unfair. A 9-10% storm death rate means the map design or storm timing is punishing players for something outside their control. Reducing this brings the experience closer to what the designer intended: players dying in combat, not to the environment.

---

## 2. GrandRift is significantly underplayed

### What caught my eye
When filtering matches by map in the sidebar, GrandRift consistently had far fewer matches available compared to the other two maps.

### The data

| Map | Total matches | Unique human players | % of all matches |
|-----|--------------|---------------------|-----------------|
| AmbroseValley | 566 | 217 | 71.1% |
| Lockdown | 171 | 79 | 21.5% |
| GrandRift | 59 | 29 | 7.4% |

GrandRift accounts for only 7.4% of all matches with just 29 unique human players over 5 days. AmbroseValley has nearly 10x the match count. Even accounting for AmbroseValley being the primary map, GrandRift's numbers are disproportionately low.

### Actionable items
- **Metrics affected**: Map queue times, player distribution across maps, overall map engagement
- **Actions**: Investigate why players avoid GrandRift. Possible causes include the map being less fun, poorly balanced, or simply less visible in the map rotation. Consider increasing GrandRift's rotation frequency, reviewing its design for pain points, or gathering player feedback specifically about this map.

### Why a level designer should care
A map that only 7.4% of players engage with represents significant design investment with low return. Understanding whether the issue is discoverability, balance, or design quality helps decide whether to improve the map or reallocate design effort elsewhere.

---

## 3. Combat clusters in the center of AmbroseValley, edges are quiet

### What caught my eye
When viewing the kill and death heatmaps on AmbroseValley, the center of the map lit up with high intensity while the edges remained mostly empty. Watching match playback confirmed this: player paths converge toward the center and most combat happens in a concentrated zone.

### The data
The top kill zones on AmbroseValley cluster around the map center:

| Zone | Kills | Average location (x, z) |
|------|-------|------------------------|
| Center | 333 | (16, 22) |
| Center-south | 294 | (28, -76) |
| West-center | 224 | (-90, 32) |

The top death zone also sits at the center with 91 deaths around coordinates (16, 2). Meanwhile, the map edges and corners show minimal combat activity.

### Actionable items
- **Metrics affected**: Map utilization percentage, combat spread, player path diversity
- **Actions**: The storm mechanic naturally pushes players inward, but if combat is too concentrated, large portions of the map become irrelevant. Consider placing high-value loot or objectives near the edges to incentivize players to spread out before converging. Alternatively, review whether the storm pushes too aggressively toward the center.

### Why a level designer should care
If 70%+ of combat happens in 25% of the map area, the remaining space is essentially wasted design. Players are missing out on terrain, cover layouts, and environmental features that were intentionally designed. Spreading combat more evenly ensures the full map gets utilized and creates more varied gameplay experiences.
