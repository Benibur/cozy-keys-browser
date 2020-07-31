import CozyClient from 'cozy-client';
import { ApiService } from 'jslib/abstractions/api.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { TokenService } from 'jslib/abstractions/token.service';

interface ICozyStackClient {
    fetchJSON: (method: string, path: string) => Promise<any>;
    fetch: (method: string, path: string, body: any, options: any) => Promise<any>;
    // collection: (docType: string) => Promise<any>;
}

interface ICozyClient {
    getStackClient: () => ICozyStackClient;
    getAppURL: () => string;
    collection: (docType:string) => any;
    // query: (queryDefinition:any) => any;
}

export class CozyClientService {
    protected instance: ICozyClient;

    constructor(protected environmentService: EnvironmentService,
        protected apiService: ApiService) {
    }

    getCozyURL(): string {
        const vaultUrl = this.environmentService.getWebVaultUrl();
        return new URL(vaultUrl).origin; // Remove the /bitwarden part
    }

    async createClient() {
        if (this.instance) {
            return this.instance;
        }

        const uri = this.getCozyURL();
        const token = await this.apiService.getActiveBearerToken();
        this.instance = new CozyClient({ uri: uri, token: token });
        return this.instance;
    }

    async updateSynchronizedAt() {
        const client = await this.createClient();

        try {
            await client.getStackClient().fetchJSON('POST', '/settings/synchronized');
        } catch (err) {
            /* tslint:disable-next-line */
            console.error('Error while updating cozy client\'s synchronized_at');
            /* tslint:disable-next-line */
            console.error(err);
        }
    }

    async deleteOAuthClient(clientId: string, registrationAccessToken: string) {
        const client = await this.createClient();

        try {
            await client.getStackClient().fetch(
                'DELETE',
                '/auth/register/' + clientId,
                undefined,
                {
                    headers: {
                        Authorization: 'Bearer ' + registrationAccessToken,
                    },
                },
            );
        } catch (err) {
            /* tslint:disable-next-line */
            console.error('Error while deleting oauth client');
            /* tslint:disable-next-line */
            console.error(err);
        }
    }

    getAppURL(appName: string, hash: string) {
        if (!appName) {
            return (new URL(this.getCozyURL())).toString();
        }
        const url = new URL(this.getCozyURL());
        const hostParts = url.host.split('.');
        url.host = [
            `${hostParts[0]}-${appName}`,
            ...hostParts.slice(1),
        ].join('.');
        if (hash) {
            url.hash = hash;
        }
        return url.toString();
    }

    async shouldRedirectToInternalUrl(url:any) {
        const client = await this.createClient();
        // const answer = await client.getStackClient().fetchJSON('POST', '/settings/synchronized')
        // partage cozy à cozy
        const answerC2C = await client.collection('io.cozy.sharings').findByDoctype('io.cozy.files')
        // partage par lien :
        const answerC2url = await client.collection('io.cozy.permissions').findLinksByDoctype('io.cozy.files')
        // const answer = await client.query(query)
        console.log(
            'cozy client answer is :\n',
            answerC2C
            // client.find('io.cozy.shared')
        );
    }

}
