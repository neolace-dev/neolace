/**
 * An image that is displayed as the result of the .image() lookup function.
 */
import React from 'react';
import { api } from 'lib/api-client';
import { Blurhash } from 'react-blurhash';
import Image from 'next/image';

import { InlineMDT, MDTContext } from './markdown-mdt/mdt';
import { RatioBox } from './widgets/ratio-box';
import { LookupValue } from './LookupValue';
 
const OptionalLink = (props: {children: React.ReactNode; href?: api.EntryValue|api.StringValue; mdtContext: MDTContext;}) => {
    if (props.href) {
        if (props.href.type === "Entry") {
            const entry: undefined|(NonNullable<api.EntryData["referenceCache"]>["entries"]["entryId"]) = props.mdtContext.refCache.entries[props.href.id];
            const url = "/entry/" + (entry?.friendlyId || props.href.id);
            return <a href={url}>{props.children}</a>;
        } else if (props.href.type === "String") {
            return <a href={props.href.value}>{props.children}</a>;
        }
    }
    return <>{props.children}</>;
};

interface ImageProps {
    value: api.ImageValue;
    mdtContext: MDTContext;
    children?: never;
}

/**
 * Render a Lookup Value (computed/query value, such as all the "properties" shown on an entry's page)
 */
export const LookupImage: React.FunctionComponent<ImageProps> = (props) => {

    const {value} = props;
    const ratio = value.width && value.height ? value.width / value.height : undefined;

    const imgEntryData = props.mdtContext.refCache.entries[value.entryId];
    const caption = (
        value.caption?.value === "" ? null :  // If caption is an empty string, don't display anything
        value.caption ? <LookupValue value={value.caption} mdtContext={props.mdtContext} /> 
        : <InlineMDT mdt={imgEntryData?.description ?? ""} context={props.mdtContext.childContextWith({entryId: value.entryId})} />
    );

    if (value.format === api.ImageDisplayFormat.PlainLogo) {
        return <div className="w-full mt-2 mb-1" style={{maxWidth: `${value.maxWidth ?? 400}px`}}>
            <OptionalLink href={value.link} mdtContext={props.mdtContext}>
                <Image
                    src={value.imageUrl}
                    width={value.width}
                    height={value.height}
                    alt={value.altText}
                    layout="intrinsic"
                />
            </OptionalLink>
        </div>
    } else if (value.format === api.ImageDisplayFormat.RightAligned) {
        return <>
            <div className="md:clear-right"></div> {/* TODO: make this way of clearing text+images optional?, just have md:clear-right applied to the div below */}
            <div className="w-full md:w-1/3 lg:w-1/4 md:float-right border-2 border-gray-400 md:ml-4 mb-2">
                <RatioBox ratio={ratio}>
                    {/* A blurry representation of the image, shown while it is loading. */}
                    <Blurhash hash={value.blurHash ?? ""} width="100%" height="100%" />
                    {/* the image: */}
                    <OptionalLink href={value.link} mdtContext={props.mdtContext}>
                        <Image
                            src={value.imageUrl}
                            width={value.width}
                            height={value.height}
                            alt={value.altText}
                            sizes={"250px" /* We're displaying these images never wider than 250px, so use a smaller image source */}
                            layout="fill"
                            objectFit="contain"
                        />
                    </OptionalLink>
                </RatioBox>
                {caption &&
                    <div className="p-1 text-sm">
                        {caption}
                    </div>
                }
            </div>
        </>
    } else {
        // Thumbnail:
        return <div className="inline-block h-20 w-20 border-2 border-gray-500 rounded-md relative">
            {/* A blurry representation of the image, shown while it is loading. */}
            <Blurhash hash={value.blurHash ?? ""} width="100%" height="100%" className="opacity-30" />
            {/* the image: */}
            <OptionalLink href={value.link} mdtContext={props.mdtContext}>
                <Image
                    src={value.imageUrl}
                    width={value.width}
                    height={value.height}
                    alt={value.altText}
                    layout="fill"
                    sizes={"100px" /* We're displaying these small thumbnails at only < 100px wide, so use a small image */}
                    objectFit={value.sizing}
                />
            </OptionalLink>
        </div>
    }
};
 