import React from "react";
import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import { ParsedUrlQuery } from "querystring";
import { FormattedMessage, useIntl } from "react-intl";

import { client, getSiteData, SiteData, useSiteData } from "lib/api-client";
import { SiteDataProvider, SitePage } from "components/SitePage";
import { UserStatus, useUser } from "lib/authentication";
import { Redirect } from "components/utils/Redirect";
import useSWR from "swr";
import { ErrorMessage } from "components/widgets/ErrorMessage";
import { Spinner } from "components/widgets/Spinner";
import { Breadcrumb, Breadcrumbs } from "components/widgets/Breadcrumbs";

interface PageProps {
    site: SiteData;
}
interface PageUrlQuery extends ParsedUrlQuery {
    siteHost: string;
}


/**
 * This site admin page lists all of the users associated with the current site.
 * @param props
 * @returns
 */
 const SiteUsersPageContent: React.FunctionComponent = function (props) {
    const user = useUser();
    const {site} = useSiteData();

    const page = 1;
    // TODO: an option to filter by username or group name. Add to the SWR key.

    // The key for caching the list of users. We include the current user's user name so that if the uesr logs out then
    // logs in again as a different admin user, they'll still see the correct results (though that's a rare case).
    const key = `siteAdmin:${site.shortId}:${user.username}:users:list:page${page}`;
    const { data, error } = useSWR(key, async () => {
        return await client.getSiteUsers({page, siteId: site.shortId});
    }, {
        // refreshInterval: 10 * 60_000,
    });

    if (user.status === UserStatus.Anonymous) {
        return <Redirect to="/account/login" />;
    }


    if (error) {
        return (
            <ErrorMessage><FormattedMessage defaultMessage="Unable to load users: {error}" id="iRRgmi" values={{error: error.message ?? "Unknown error"}}/></ErrorMessage>
        );
    }

    return (<>
        <p>
            {(
                data === undefined ? <FormattedMessage defaultMessage="Loading..." id="gjBiyj"/> :
                <FormattedMessage defaultMessage="Showing {totalCount, plural, one {# user} other {# users}}." id="KWCDqi" values={{totalCount: data?.totalCount}}/>
            )}
        </p>
        <table className="[&_th]:text-left [&_td]:pr-2 [&_th]:pr-2">
            <thead>
                <tr>
                    <th><FormattedMessage defaultMessage="Name" id="HAlOn1" /></th>
                    <th><FormattedMessage defaultMessage="Username" id="JCIgkj" /></th>
                    <th><FormattedMessage defaultMessage="User Type" id="Gt4GcJ" /></th>
                    <th><FormattedMessage defaultMessage="Groups" id="hzmswI" /></th>
                </tr>
            </thead>
            <tbody>
                {
                    data?.values.map((row) => (
                        <tr key={row.username}>
                            <td>{row.fullName}</td>
                            <td>{row.username}</td>
                            <td>{(row.isBot ? <FormattedMessage defaultMessage="Bot" id="03nvvB" /> : <FormattedMessage defaultMessage="Regular User" id="ws6YOC" />)}</td>
                            <td>{row.groups ? row.groups.map((g) => <span key={g.id}>{g.name}{" "}</span>) : "▀▀▀▀▀▀▀"}</td>
                        </tr>
                    )) ?? <tr><td colSpan={100}><Spinner/></td></tr>
                }
            </tbody>
        </table>
    </>);
};

/**
 * This site admin page lists all of the users associated with the current site.
 * @param props
 * @returns
 */
const SiteUsersPage: NextPage<PageProps> = function (props) {
    const intl = useIntl();
    const user = useUser();

    if (user.status === UserStatus.Anonymous) {
        return <Redirect to="/account/login" />;
    }

    const title = intl.formatMessage({ id: "YDMrKK", defaultMessage: "Users" });

    return (
        <SiteDataProvider sitePreloaded={props.site}>
            <SitePage title={title}>
                <Breadcrumbs>
                    <Breadcrumb href={`/`}>{props.site.name}</Breadcrumb>
                    <Breadcrumb href={`/admin`}>
                        <FormattedMessage id="iOBTBR" defaultMessage="Site Administration" />
                    </Breadcrumb>
                    <Breadcrumb>{title}</Breadcrumb>
                </Breadcrumbs>
                <h1 className="text-3xl font-semibold">{title}</h1>
                <SiteUsersPageContent />
            </SitePage>
        </SiteDataProvider>
    );
};

export default SiteUsersPage;

export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return await {
        // Which pages to pre-generate at build time. For now, we generate all pages on-demand.
        paths: [],
        // Enable statically generating any additional pages as needed
        fallback: "blocking",
    };
};

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    if (!context.params) throw new Error("Internal error - missing URL params."); // Make TypeScript happy
    // Look up the Neolace site by domain:
    const site = await getSiteData(context.params.siteHost);
    if (site === null) return { notFound: true };
    return { props: { site } };
};
