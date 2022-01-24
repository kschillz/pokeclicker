/// <reference path="../../declarations/DataStore/StatisticStore/index.d.ts" />
/// <reference path="../GameConstants.d.ts" />

class MapHelper {

    public static moveToRoute = function (route: number, region: GameConstants.Region) {
        if (isNaN(route)) {
            return;
        }
        let genNewEnemy = false;
        if (route != player.route()) {
            genNewEnemy = true;
        }
        if (this.accessToRoute(route, region)) {
            player.route(route);
            if (player.region != region) {
                player.region = region;
                // Always go back to the main island when changing regions
                player.subregion = 0;
            }
            if (genNewEnemy && !Battle.catching()) {
                Battle.generateNewEnemy();
            }
            App.game.gameState = GameConstants.GameState.fighting;
        } else {
            if (!MapHelper.routeExist(route, region)) {
                return Notifier.notify({
                    message: `${Routes.getName(route, region)} does not exist in the ${GameConstants.Region[region]} region.`,
                    type: NotificationConstants.NotificationOption.danger,
                });
            }

            const routeData = Routes.getRoute(region, route);
            const reqsList = [];

            routeData.requirements?.forEach(requirement => {
                if (!requirement.isCompleted()) {
                    reqsList.push(requirement.hint());
                }
            });

            Notifier.notify({
                message: `You don't have access to that route yet.<br/>${reqsList.join('<br/>')}`,
                type: NotificationConstants.NotificationOption.warning,
            });
        }
    };

    public static routeExist(route: number, region: GameConstants.Region): boolean {
        return !!Routes.getRoute(region, route);
    }

    public static normalizeRoute(route: number, region: GameConstants.Region): number {
        return Routes.normalizedNumber(region, route);
    }

    public static accessToRoute = function (route: number, region: GameConstants.Region) {
        return this.routeExist(route, region) && Routes.getRoute(region, route).isUnlocked();
    };

    public static getCurrentEnvironment(): GameConstants.Environment {
        const area = player.route() || player.town()?.name || undefined;

        const [env] = Object.entries(GameConstants.Environments).find(
            ([, regions]) => regions[player.region]?.has(area)
        ) || [];

        return (env as GameConstants.Environment);
    }

    public static calculateBattleCssClass(): string {
        return GameConstants.EnvironmentCssClass[this.getCurrentEnvironment()];
    }

    public static calculateRouteCssClass(route: number, region: GameConstants.Region): string {
        let cls = '';

        if (player.route() == route && player.region == region) {
            cls = 'currentLocation';
        } else if (!MapHelper.accessToRoute(route, region)) {
            cls = 'locked';
        } else  if (App.game.statistics.routeKills[region][route]() < GameConstants.ROUTE_KILLS_NEEDED) {
            cls = 'unlockedUnfinished';
        } else if (!RouteHelper.routeCompleted(route, region, false)) {
            cls = 'uncaughtPokemon';
        } else if (!RouteHelper.routeCompleted(route, region, true)) {
            cls = 'uncaughtShinyPokemon';
        } else {
            cls = 'completed';
        }

        // Water routes
        if (GameConstants.Environments.Water[region]?.has(route)) {
            cls = `${cls} waterRoute`;
        }

        return cls;
    }

    public static calculateRouteA11yLabel(route: number, region: GameConstants.Region): string {
        const cssClass = this.calculateRouteCssClass(route, region);
        if (cssClass.includes('currentLocation')) {
            return `Route ${route} (Current Location)`;
        } else if (cssClass.includes('locked') && !cssClass.includes('unlocked')) {
            return `Route ${route} (Locked)`;
        } else {
            return `Route ${route}`;
        }
    }

    public static calculateTownCssClass(town: string): string {
        if (!player.route() && player.town().name == town) {
            return 'currentLocation';
        }
        if (!MapHelper.accessToTown(town)) {
            return 'locked';
        }
        if (dungeonList.hasOwnProperty(town)) {
            if (!App.game.statistics.dungeonsCleared[GameConstants.getDungeonIndex(town)]()) {
                return 'unlockedUnfinished';
            } else if (!DungeonRunner.dungeonCompleted(dungeonList[town], false)) {
                return 'uncaughtPokemon';
            } else if (!DungeonRunner.dungeonCompleted(dungeonList[town], true)) {
                return 'uncaughtShinyPokemon';
            }
        }
        if (gymList.hasOwnProperty(town)) {
            const gym = gymList[town];
            // If defeated the previous gym, but not this one
            const gymIndex = GameConstants.getGymIndex(town);
            if (Gym.isUnlocked(gym) && !App.game.badgeCase.hasBadge(gym.badgeReward)) {
                return 'unlockedUnfinished';
            }
        }
        return 'completed';
    }

    public static calculateTownA11yLabel(town: string): string {
        switch (this.calculateTownCssClass(town)) {
            case 'currentLocation': return `${town} (Current Location)`;
            case 'locked': return `${town} (Locked)`;
            default: return town;
        }
    }

    public static accessToTown(townName: string): boolean {
        const town = TownList[townName];
        if (!town) {
            return false;
        }
        return town.isUnlocked();
    }

    public static moveToTown(townName: string) {
        if (MapHelper.accessToTown(townName)) {
            App.game.gameState = GameConstants.GameState.idle;
            player.route(0);
            const town = TownList[townName];
            player.town(town);
            Battle.enemyPokemon(null);
            //this should happen last, so all the values all set beforehand
            App.game.gameState = GameConstants.GameState.town;
        } else {
            const town = TownList[townName];
            const reqsList = [];

            town.requirements?.forEach(requirement => {
                if (!requirement.isCompleted()) {
                    reqsList.push(requirement.hint());
                }
            });

            Notifier.notify({
                message: `You don't have access to that location yet.<br/>${reqsList.join('<br/>')}`,
                type: NotificationConstants.NotificationOption.warning,
            });
        }
    }

    public static validRoute(route = 0, region: GameConstants.Region = 0): boolean {
        return !!Routes.getRoute(region, route);
    }

    public static openShipModal() {
        const openModal = () => {
            $('#ShipModal').modal('show');
        };
        switch (player.region) {
            case GameConstants.Region.kanto:
                if (TownList['Vermilion City'].isUnlocked() && player.highestRegion() > 0) {
                    openModal();
                    return;
                }
            case GameConstants.Region.johto:
                if (TownList['Olivine City'].isUnlocked()) {
                    openModal();
                    return;
                }
            case GameConstants.Region.hoenn:
                if (TownList['Slateport City'].isUnlocked()) {
                    openModal();
                    return;
                }
            case GameConstants.Region.sinnoh:
                if (TownList['Canalave City'].isUnlocked()) {
                    openModal();
                    return;
                }
            case GameConstants.Region.unova:
                if (TownList['Castelia City'].isUnlocked()) {
                    openModal();
                    return;
                }
            case GameConstants.Region.kalos:
                if (TownList['Coumarine City'].isUnlocked()) {
                    openModal();
                    return;
                }
            case GameConstants.Region.alola:
                if (TownList['Hau\'oli City'].isUnlocked()) {
                    openModal();
                    return;
                }
        }

        Notifier.notify({
            message: 'You cannot access this dock yet',
            type: NotificationConstants.NotificationOption.warning,
        });
    }

    public static ableToTravel() {
        // If player already reached highest region, they can't move on
        if (player.highestRegion() >= GameConstants.MAX_AVAILABLE_REGION) {
            return false;
        }

        // Check if player doesn't require complete dex to move on to the next region and has access to next regions starter town
        if (!App.game.challenges.list.requireCompletePokedex.active()) {
            return TownList[GameConstants.StartingTowns[player.highestRegion() + 1]]?.isUnlocked() ?? false;
        }

        // Check if all regional pokemon are obtained
        return new Set(App.game.party.caughtPokemon.filter(p => p.id > 0 && PokemonHelper.calcNativeRegion(p.name) <= player.highestRegion()).map(p => Math.floor(p.id))).size >= GameConstants.TotalPokemonsPerRegion[player.highestRegion()];
    }

    public static travelToNextRegion() {
        if (MapHelper.ableToTravel()) {
            // Gain queue slots based on highest region
            App.game.breeding.gainQueueSlot(App.game.breeding.queueSlotsGainedFromRegion(player.highestRegion()));
            GameHelper.incrementObservable(player.highestRegion);
            MapHelper.moveToTown(GameConstants.StartingTowns[player.highestRegion()]);
            player.region = player.highestRegion();
            // Track when users move region and how long it took in seconds
            LogEvent('new region', 'new region',
                GameConstants.Region[player.highestRegion()],
                App.game.statistics.secondsPlayed());
            // Gather users attack when they moved regions
            LogEvent('attack measurement', 'new region',
                GameConstants.Region[player.highestRegion()],
                App.game.party.calculatePokemonAttack(undefined, undefined, true, undefined, true, false, false));
        }
    }

}
